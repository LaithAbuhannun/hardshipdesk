-- Demo data. All names, emails and contract numbers are fictional.
-- Dates are relative to the day the migration runs so the dashboard always shows a realistic mix.

DECLARE @T DATE = CAST(SYSDATETIME() AS DATE);

INSERT dbo.Customers (FullName, Email, Phone) VALUES
 (N'Priya Sharma',     N'priya.sharma@example.com',  N'0400 000 101'),
 (N'Daniel Okafor',    N'daniel.okafor@example.com', N'0400 000 102'),
 (N'Mei Lin Chen',     N'meilin.chen@example.com',   N'0400 000 103'),
 (N'Tom Gallagher',    N'tom.gallagher@example.com', N'0400 000 104'),
 (N'Aisha Rahman',     N'aisha.rahman@example.com',  N'0400 000 105'),
 (N'Lucas Moreau',     N'lucas.moreau@example.com',  N'0400 000 106'),
 (N'Sarah Nguyen',     N'sarah.nguyen@example.com',  N'0400 000 107'),
 (N'Jack Thompson',    N'jack.thompson@example.com', N'0400 000 108');

INSERT dbo.CreditContracts (CustomerId, ContractNumber, ProductType, Balance) VALUES
 (1, N'HL-204118', N'Home Loan',     612400.00),
 (2, N'PL-330921', N'Personal Loan',  18250.00),
 (3, N'CC-778213', N'Credit Card',     7340.55),
 (4, N'CL-119044', N'Car Loan',       29800.00),
 (5, N'HL-205562', N'Home Loan',     488900.00),
 (6, N'BN-901337', N'BNPL',             960.00),
 (7, N'PL-331478', N'Personal Loan',  11420.00),
 (8, N'HL-206003', N'Home Loan',     731050.00);

INSERT dbo.HardshipCases (ContractId, Channel, Reason, ReceivedDate, Status, InfoRequestedDate, InfoReceivedDate, RespondedDate, Outcome, ArrangementDays, VariationNoticeSentDate, AssignedTo) VALUES
 (1, N'Phone',  N'Made redundant last month; partner on reduced hours.',            DATEADD(DAY, -19, @T), N'Open',          NULL, NULL, NULL, NULL, NULL, NULL, N'Jess Walker'),
 (2, N'Email',  N'Medical leave for surgery, expected back at work in 8 weeks.',    DATEADD(DAY, -23, @T), N'Open',          NULL, NULL, NULL, NULL, NULL, NULL, N'Omar Haddad'),
 (3, N'Web',    N'Hours cut at work, asking to pause repayments for 3 months.',     DATEADD(DAY, -10, @T), N'InfoRequested', DATEADD(DAY, -8, @T), NULL, NULL, NULL, NULL, NULL, N'Jess Walker'),
 (4, N'Broker', N'Small business income down after flooding.',                     DATEADD(DAY, -30, @T), N'InfoRequested', DATEADD(DAY, -25, @T), NULL, NULL, NULL, NULL, NULL, N'Omar Haddad'),
 (5, N'Branch', N'Separation; now on a single income with two children.',          DATEADD(DAY, -16, @T), N'InfoReceived',  DATEADD(DAY, -14, @T), DATEADD(DAY, -4, @T), NULL, NULL, NULL, NULL, N'Jess Walker'),
 (6, N'Web',    N'Unexpected car repair bill; asking for a short payment holiday.',  DATEADD(DAY, -3, @T),  N'Open',          NULL, NULL, NULL, NULL, NULL, NULL, NULL),
 (7, N'Phone',  N'Lost casual job; needs reduced repayments for 6 months.',         DATEADD(DAY, -60, @T), N'Responded',     NULL, NULL, DATEADD(DAY, -45, @T), N'Approved', 180, NULL, N'Omar Haddad'),
 (8, N'Email',  N'Interest rate rises; asked to extend loan term.',                 DATEADD(DAY, -50, @T), N'Responded',     DATEADD(DAY, -40, @T), DATEADD(DAY, -35, @T), DATEADD(DAY, -12, @T), N'Declined', NULL, NULL, N'Jess Walker');

INSERT dbo.CaseEvents (CaseId, EventType, Detail, Actor)
SELECT CaseId, N'HardshipNoticeReceived', CONCAT(N'Received via ', Channel, N' on ', CONVERT(NVARCHAR(10), ReceivedDate, 23)), N'seed'
FROM dbo.HardshipCases;
