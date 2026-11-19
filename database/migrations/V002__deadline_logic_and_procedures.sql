-- Statutory clock logic and stored procedures.
-- National Credit Code s72 timeframes (see README for sources):
--   * Info may be requested within 21 days after the day the hardship notice is received.
--   * No info requested            -> respond within 21 days after receipt of the notice.
--   * Info requested and received  -> respond within 21 days after the info is received.
--   * Info requested, not received -> respond within 28 days after the request.
--   * Approved arrangement > 90 days -> written variation notice within 30 days of agreement.

CREATE OR ALTER FUNCTION dbo.tvf_CaseClock (@Today DATE)
RETURNS TABLE
AS
RETURN
    SELECT
        c.CaseId,
        c.CaseReference,
        cu.FullName       AS CustomerName,
        cu.Email          AS CustomerEmail,
        cc.ContractNumber,
        cc.ProductType,
        cc.Balance,
        c.Channel,
        c.Reason,
        c.Status,
        c.ReceivedDate,
        c.InfoRequestedDate,
        c.InfoReceivedDate,
        c.RespondedDate,
        c.Outcome,
        c.ArrangementDays,
        c.VariationNoticeSentDate,
        c.AssignedTo,
        DATEADD(DAY, 21, c.ReceivedDate) AS InfoRequestDeadline,
        due.ResponseDueDate,
        due.RuleApplied,
        vn.VariationNoticeDueDate,
        dr.DaysRemaining,
        CASE
            WHEN c.RespondedDate IS NOT NULL AND c.RespondedDate <= due.ResponseDueDate THEN N'Met'
            WHEN c.RespondedDate IS NOT NULL THEN N'Breached'
            WHEN dr.DaysRemaining < 0 THEN N'Overdue'
            WHEN dr.DaysRemaining <= 3 THEN N'Critical'
            WHEN dr.DaysRemaining <= 7 THEN N'Warning'
            ELSE N'OnTrack'
        END AS RiskLevel
    FROM dbo.HardshipCases c
    JOIN dbo.CreditContracts cc ON cc.ContractId = c.ContractId
    JOIN dbo.Customers cu       ON cu.CustomerId = cc.CustomerId
    CROSS APPLY (
        SELECT
            CASE
                WHEN c.InfoRequestedDate IS NULL     THEN DATEADD(DAY, 21, c.ReceivedDate)
                WHEN c.InfoReceivedDate IS NOT NULL  THEN DATEADD(DAY, 21, c.InfoReceivedDate)
                ELSE                                      DATEADD(DAY, 28, c.InfoRequestedDate)
            END AS ResponseDueDate,
            CASE
                WHEN c.InfoRequestedDate IS NULL     THEN N'21 days after the hardship notice was received'
                WHEN c.InfoReceivedDate IS NOT NULL  THEN N'21 days after the requested information was received'
                ELSE                                      N'28 days after information was requested (not yet received)'
            END AS RuleApplied
    ) due
    CROSS APPLY (
        SELECT DATEDIFF(DAY, ISNULL(c.RespondedDate, @Today), due.ResponseDueDate) AS DaysRemaining
    ) dr
    CROSS APPLY (
        SELECT CASE
                   WHEN c.Outcome = N'Approved' AND c.ArrangementDays > 90 THEN DATEADD(DAY, 30, c.RespondedDate)
               END AS VariationNoticeDueDate
    ) vn;
GO

CREATE OR ALTER PROCEDURE dbo.usp_CreateCase
    @FullName       NVARCHAR(200),
    @Email          NVARCHAR(320),
    @Phone          NVARCHAR(30)   = NULL,
    @ContractNumber NVARCHAR(30),
    @ProductType    NVARCHAR(30),
    @Balance        DECIMAL(14,2)  = 0,
    @Channel        NVARCHAR(20),
    @Reason         NVARCHAR(1000),
    @ReceivedDate   DATE,
    @AssignedTo     NVARCHAR(100)  = NULL,
    @Actor          NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    DECLARE @CustomerId INT = (SELECT CustomerId FROM dbo.Customers WITH (UPDLOCK, HOLDLOCK) WHERE Email = @Email);
    IF @CustomerId IS NULL
    BEGIN
        INSERT dbo.Customers (FullName, Email, Phone) VALUES (@FullName, @Email, @Phone);
        SET @CustomerId = SCOPE_IDENTITY();
    END

    DECLARE @ContractId INT, @ContractOwner INT;
    SELECT @ContractId = ContractId, @ContractOwner = CustomerId
    FROM dbo.CreditContracts WITH (UPDLOCK, HOLDLOCK)
    WHERE ContractNumber = @ContractNumber;

    IF @ContractId IS NOT NULL AND @ContractOwner <> @CustomerId
        THROW 50010, N'That contract number belongs to a different customer.', 1;

    IF @ContractId IS NULL
    BEGIN
        INSERT dbo.CreditContracts (CustomerId, ContractNumber, ProductType, Balance)
        VALUES (@CustomerId, @ContractNumber, @ProductType, @Balance);
        SET @ContractId = SCOPE_IDENTITY();
    END

    INSERT dbo.HardshipCases (ContractId, Channel, Reason, ReceivedDate, AssignedTo)
    VALUES (@ContractId, @Channel, @Reason, @ReceivedDate, @AssignedTo);

    DECLARE @CaseId INT = SCOPE_IDENTITY();

    INSERT dbo.CaseEvents (CaseId, EventType, Detail, Actor)
    VALUES (@CaseId, N'HardshipNoticeReceived', CONCAT(N'Received via ', @Channel, N' on ', CONVERT(NVARCHAR(10), @ReceivedDate, 23)), @Actor);

    COMMIT TRANSACTION;

    SELECT @CaseId AS CaseId;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_GetCases
    @Today  DATE,
    @Status NVARCHAR(20)  = NULL,
    @Risk   NVARCHAR(20)  = NULL,
    @Search NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT CaseId, CaseReference, CustomerName, ContractNumber, ProductType, Channel, Status,
           ReceivedDate, InfoRequestedDate, InfoReceivedDate, RespondedDate, Outcome,
           ResponseDueDate, DaysRemaining, RiskLevel, AssignedTo
    FROM dbo.tvf_CaseClock(@Today)
    WHERE (@Status IS NULL OR Status = @Status)
      AND (@Risk IS NULL OR RiskLevel = @Risk)
      AND (@Search IS NULL
           OR CustomerName   LIKE N'%' + @Search + N'%'
           OR CaseReference  LIKE N'%' + @Search + N'%'
           OR ContractNumber LIKE N'%' + @Search + N'%')
    ORDER BY CASE WHEN RespondedDate IS NULL THEN 0 ELSE 1 END, DaysRemaining, CaseId
    -- Optional filters: recompile so each call gets a plan for the filters actually supplied.
    OPTION (RECOMPILE);
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_GetCaseById
    @CaseId INT,
    @Today  DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT * FROM dbo.tvf_CaseClock(@Today) WHERE CaseId = @CaseId;

    SELECT EventId, EventType, Detail, Actor, OccurredAt
    FROM dbo.CaseEvents
    WHERE CaseId = @CaseId
    ORDER BY OccurredAt, EventId;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_RequestInformation
    @CaseId      INT,
    @RequestDate DATE,
    @Details     NVARCHAR(1000),
    @Actor       NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Status NVARCHAR(20), @ReceivedDate DATE;
    SELECT @Status = Status, @ReceivedDate = ReceivedDate FROM dbo.HardshipCases WHERE CaseId = @CaseId;

    IF @Status IS NULL                                       THROW 50404, N'Case not found.', 1;
    IF @Status <> N'Open'                                    THROW 50001, N'Information can only be requested on an open case.', 1;
    IF @RequestDate < @ReceivedDate                          THROW 50002, N'The request date cannot be before the hardship notice was received.', 1;
    IF @RequestDate > DATEADD(DAY, 21, @ReceivedDate)        THROW 50003, N'Information must be requested within 21 days of receiving the hardship notice (NCC s72).', 1;

    BEGIN TRANSACTION;
    UPDATE dbo.HardshipCases SET Status = N'InfoRequested', InfoRequestedDate = @RequestDate WHERE CaseId = @CaseId;
    INSERT dbo.CaseEvents (CaseId, EventType, Detail, Actor) VALUES (@CaseId, N'InformationRequested', @Details, @Actor);
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_RecordInformationReceived
    @CaseId       INT,
    @ReceivedDate DATE,
    @Actor        NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Status NVARCHAR(20), @RequestedDate DATE;
    SELECT @Status = Status, @RequestedDate = InfoRequestedDate FROM dbo.HardshipCases WHERE CaseId = @CaseId;

    IF @Status IS NULL                THROW 50404, N'Case not found.', 1;
    IF @Status <> N'InfoRequested'    THROW 50004, N'No outstanding information request on this case.', 1;
    IF @ReceivedDate < @RequestedDate THROW 50005, N'Information cannot be received before it was requested.', 1;

    BEGIN TRANSACTION;
    UPDATE dbo.HardshipCases SET Status = N'InfoReceived', InfoReceivedDate = @ReceivedDate WHERE CaseId = @CaseId;
    INSERT dbo.CaseEvents (CaseId, EventType, Detail, Actor)
    VALUES (@CaseId, N'InformationReceived', CONCAT(N'Customer provided information on ', CONVERT(NVARCHAR(10), @ReceivedDate, 23)), @Actor);
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_RecordResponse
    @CaseId          INT,
    @RespondedDate   DATE,
    @Outcome         NVARCHAR(20),
    @ArrangementDays INT            = NULL,
    @Notes           NVARCHAR(1000) = NULL,
    @Actor           NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Status NVARCHAR(20), @ReceivedDate DATE;
    SELECT @Status = Status, @ReceivedDate = ReceivedDate FROM dbo.HardshipCases WHERE CaseId = @CaseId;

    IF @Status IS NULL                                        THROW 50404, N'Case not found.', 1;
    IF @Status = N'Responded'                                 THROW 50006, N'A response has already been recorded for this case.', 1;
    IF @RespondedDate < @ReceivedDate                         THROW 50007, N'The response date cannot be before the hardship notice was received.', 1;
    IF @Outcome = N'Approved' AND @ArrangementDays IS NULL    THROW 50008, N'An approved arrangement needs its length in days.', 1;

    BEGIN TRANSACTION;
    UPDATE dbo.HardshipCases
    SET Status = N'Responded', RespondedDate = @RespondedDate, Outcome = @Outcome,
        ArrangementDays = CASE WHEN @Outcome = N'Approved' THEN @ArrangementDays END
    WHERE CaseId = @CaseId;

    INSERT dbo.CaseEvents (CaseId, EventType, Detail, Actor)
    VALUES (@CaseId, CONCAT(N'Response', @Outcome),
            CONCAT(CASE WHEN @Outcome = N'Approved' THEN CONCAT(@ArrangementDays, N'-day arrangement. ') END, @Notes),
            @Actor);
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_RecordVariationNotice
    @CaseId   INT,
    @SentDate DATE,
    @Actor    NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.HardshipCases WHERE CaseId = @CaseId AND Outcome = N'Approved' AND ArrangementDays > 90)
        THROW 50009, N'A written variation notice is only tracked for approved arrangements longer than 90 days.', 1;

    BEGIN TRANSACTION;
    UPDATE dbo.HardshipCases SET VariationNoticeSentDate = @SentDate WHERE CaseId = @CaseId;
    INSERT dbo.CaseEvents (CaseId, EventType, Detail, Actor)
    VALUES (@CaseId, N'VariationNoticeSent', CONCAT(N'Written variation notice sent on ', CONVERT(NVARCHAR(10), @SentDate, 23)), @Actor);
    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_GetDashboard
    @Today DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        SUM(CASE WHEN RespondedDate IS NULL THEN 1 ELSE 0 END)                                         AS OpenCases,
        SUM(CASE WHEN RiskLevel = N'Overdue' THEN 1 ELSE 0 END)                                        AS Overdue,
        SUM(CASE WHEN RiskLevel = N'Critical' THEN 1 ELSE 0 END)                                       AS Critical,
        SUM(CASE WHEN RiskLevel = N'Warning' THEN 1 ELSE 0 END)                                        AS Warning,
        SUM(CASE WHEN Status = N'InfoRequested' THEN 1 ELSE 0 END)                                     AS AwaitingCustomer,
        SUM(CASE WHEN VariationNoticeDueDate IS NOT NULL AND VariationNoticeSentDate IS NULL THEN 1 ELSE 0 END) AS VariationNoticesPending,
        SUM(CASE WHEN RespondedDate >= DATEADD(DAY, -90, @Today) THEN 1 ELSE 0 END)                    AS RespondedLast90Days,
        SUM(CASE WHEN RespondedDate >= DATEADD(DAY, -90, @Today) AND RiskLevel = N'Met' THEN 1 ELSE 0 END) AS OnTimeLast90Days,
        AVG(CASE WHEN RespondedDate IS NOT NULL THEN CAST(DATEDIFF(DAY, ReceivedDate, RespondedDate) AS DECIMAL(6,1)) END) AS AvgDaysToRespond
    FROM dbo.tvf_CaseClock(@Today);
END
GO

-- Called by the Hangfire job every morning. Set-based and idempotent:
-- running it twice on the same day creates no duplicate alerts.
CREATE OR ALTER PROCEDURE dbo.usp_FlagAtRiskCases
    @Today DATE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Created TABLE (AlertId INT);

    INSERT dbo.DeadlineAlerts (CaseId, AlertType, RiskLevel, DueDate)
    OUTPUT inserted.AlertId INTO @Created
    SELECT k.CaseId, N'ResponseDue', k.RiskLevel, k.ResponseDueDate
    FROM dbo.tvf_CaseClock(@Today) k
    WHERE k.RiskLevel IN (N'Critical', N'Overdue')
      AND NOT EXISTS (SELECT 1 FROM dbo.DeadlineAlerts a
                      WHERE a.CaseId = k.CaseId AND a.AlertType = N'ResponseDue'
                        AND a.DueDate = k.ResponseDueDate AND a.RiskLevel = k.RiskLevel)

    UNION ALL

    SELECT k.CaseId, N'VariationNoticeDue',
           CASE WHEN k.VariationNoticeDueDate < @Today THEN N'Overdue' ELSE N'Critical' END,
           k.VariationNoticeDueDate
    FROM dbo.tvf_CaseClock(@Today) k
    WHERE k.VariationNoticeDueDate IS NOT NULL
      AND k.VariationNoticeSentDate IS NULL
      AND DATEDIFF(DAY, @Today, k.VariationNoticeDueDate) <= 5
      AND NOT EXISTS (SELECT 1 FROM dbo.DeadlineAlerts a
                      WHERE a.CaseId = k.CaseId AND a.AlertType = N'VariationNoticeDue'
                        AND a.DueDate = k.VariationNoticeDueDate
                        AND a.RiskLevel = CASE WHEN k.VariationNoticeDueDate < @Today THEN N'Overdue' ELSE N'Critical' END);

    SELECT COUNT(*) AS AlertsCreated FROM @Created;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_GetAlerts
    @IncludeAcknowledged BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT a.AlertId, a.CaseId, c.CaseReference, cu.FullName AS CustomerName, a.AlertType, a.RiskLevel,
           a.DueDate, a.CreatedAt, a.AcknowledgedAt, a.AcknowledgedBy, c.AssignedTo
    FROM dbo.DeadlineAlerts a
    JOIN dbo.HardshipCases c   ON c.CaseId = a.CaseId
    JOIN dbo.CreditContracts cc ON cc.ContractId = c.ContractId
    JOIN dbo.Customers cu       ON cu.CustomerId = cc.CustomerId
    WHERE @IncludeAcknowledged = 1 OR a.AcknowledgedAt IS NULL
    ORDER BY CASE a.RiskLevel WHEN N'Overdue' THEN 0 ELSE 1 END, a.DueDate;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_AcknowledgeAlert
    @AlertId INT,
    @Actor   NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.DeadlineAlerts
    SET AcknowledgedAt = SYSUTCDATETIME(), AcknowledgedBy = @Actor
    WHERE AlertId = @AlertId AND AcknowledgedAt IS NULL;

    IF @@ROWCOUNT = 0 THROW 50404, N'Alert not found or already acknowledged.', 1;
END
GO
