-- HardshipDesk schema
-- Versioned migration (Redgate Flyway naming: V<version>__<description>.sql)

CREATE TABLE dbo.Customers (
    CustomerId   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Customers PRIMARY KEY,
    FullName     NVARCHAR(200)     NOT NULL,
    Email        NVARCHAR(320)     NOT NULL CONSTRAINT UQ_Customers_Email UNIQUE,
    Phone        NVARCHAR(30)      NULL,
    CreatedAt    DATETIME2(0)      NOT NULL CONSTRAINT DF_Customers_CreatedAt DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE dbo.CreditContracts (
    ContractId     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CreditContracts PRIMARY KEY,
    CustomerId     INT               NOT NULL CONSTRAINT FK_CreditContracts_Customers REFERENCES dbo.Customers (CustomerId),
    ContractNumber NVARCHAR(30)      NOT NULL CONSTRAINT UQ_CreditContracts_Number UNIQUE,
    ProductType    NVARCHAR(30)      NOT NULL CONSTRAINT CK_CreditContracts_ProductType
                       CHECK (ProductType IN (N'Home Loan', N'Personal Loan', N'Car Loan', N'Credit Card', N'BNPL')),
    Balance        DECIMAL(14,2)     NOT NULL CONSTRAINT DF_CreditContracts_Balance DEFAULT 0
);
GO

CREATE TABLE dbo.HardshipCases (
    CaseId                  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_HardshipCases PRIMARY KEY,
    CaseReference           AS (N'HD-' + RIGHT(N'00000' + CAST(CaseId AS NVARCHAR(10)), 5)),
    ContractId              INT            NOT NULL CONSTRAINT FK_HardshipCases_Contracts REFERENCES dbo.CreditContracts (ContractId),
    Channel                 NVARCHAR(20)   NOT NULL CONSTRAINT CK_HardshipCases_Channel
                                CHECK (Channel IN (N'Phone', N'Email', N'Web', N'Branch', N'Broker')),
    Reason                  NVARCHAR(1000) NOT NULL,
    ReceivedDate            DATE           NOT NULL,
    Status                  NVARCHAR(20)   NOT NULL CONSTRAINT DF_HardshipCases_Status DEFAULT N'Open'
                                CONSTRAINT CK_HardshipCases_Status CHECK (Status IN (N'Open', N'InfoRequested', N'InfoReceived', N'Responded')),
    InfoRequestedDate       DATE           NULL,
    InfoReceivedDate        DATE           NULL,
    RespondedDate           DATE           NULL,
    Outcome                 NVARCHAR(20)   NULL CONSTRAINT CK_HardshipCases_Outcome CHECK (Outcome IN (N'Approved', N'Declined')),
    ArrangementDays         INT            NULL CONSTRAINT CK_HardshipCases_ArrangementDays CHECK (ArrangementDays BETWEEN 1 AND 730),
    VariationNoticeSentDate DATE           NULL,
    AssignedTo              NVARCHAR(100)  NULL,
    CreatedAt               DATETIME2(0)   NOT NULL CONSTRAINT DF_HardshipCases_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_HardshipCases_InfoRequestedAfterReceipt CHECK (InfoRequestedDate IS NULL OR InfoRequestedDate >= ReceivedDate),
    CONSTRAINT CK_HardshipCases_InfoReceivedAfterRequest  CHECK (InfoReceivedDate IS NULL OR (InfoRequestedDate IS NOT NULL AND InfoReceivedDate >= InfoRequestedDate)),
    CONSTRAINT CK_HardshipCases_RespondedAfterReceipt     CHECK (RespondedDate IS NULL OR RespondedDate >= ReceivedDate)
);
GO

-- Most queries read open cases, so this index covers the deadline calculation without a key lookup.
CREATE INDEX IX_HardshipCases_Status
    ON dbo.HardshipCases (Status)
    INCLUDE (ReceivedDate, InfoRequestedDate, InfoReceivedDate, RespondedDate, Outcome, ArrangementDays, VariationNoticeSentDate);
GO

CREATE TABLE dbo.CaseEvents (
    EventId    BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CaseEvents PRIMARY KEY,
    CaseId     INT            NOT NULL CONSTRAINT FK_CaseEvents_Cases REFERENCES dbo.HardshipCases (CaseId),
    EventType  NVARCHAR(40)   NOT NULL,
    Detail     NVARCHAR(1000) NULL,
    Actor      NVARCHAR(100)  NOT NULL,
    OccurredAt DATETIME2(0)   NOT NULL CONSTRAINT DF_CaseEvents_OccurredAt DEFAULT SYSUTCDATETIME()
);
GO

CREATE INDEX IX_CaseEvents_CaseId ON dbo.CaseEvents (CaseId, OccurredAt);
GO

CREATE TABLE dbo.DeadlineAlerts (
    AlertId        INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DeadlineAlerts PRIMARY KEY,
    CaseId         INT           NOT NULL CONSTRAINT FK_DeadlineAlerts_Cases REFERENCES dbo.HardshipCases (CaseId),
    AlertType      NVARCHAR(30)  NOT NULL CONSTRAINT CK_DeadlineAlerts_Type CHECK (AlertType IN (N'ResponseDue', N'VariationNoticeDue')),
    RiskLevel      NVARCHAR(20)  NOT NULL CONSTRAINT CK_DeadlineAlerts_Risk CHECK (RiskLevel IN (N'Critical', N'Overdue')),
    DueDate        DATE          NOT NULL,
    CreatedAt      DATETIME2(0)  NOT NULL CONSTRAINT DF_DeadlineAlerts_CreatedAt DEFAULT SYSUTCDATETIME(),
    AcknowledgedAt DATETIME2(0)  NULL,
    AcknowledgedBy NVARCHAR(100) NULL,
    -- One alert per case, deadline and risk level, so the daily job can run any number of times safely.
    CONSTRAINT UQ_DeadlineAlerts UNIQUE (CaseId, AlertType, DueDate, RiskLevel)
);
GO
