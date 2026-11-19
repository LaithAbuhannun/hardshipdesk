using System.ComponentModel.DataAnnotations;

namespace HardshipDesk.Api.Models;

// ---------- Rows returned by stored procedures (Dapper maps by column name) ----------

public sealed class CaseSummaryRow
{
    public int CaseId { get; init; }
    public string CaseReference { get; init; } = "";
    public string CustomerName { get; init; } = "";
    public string ContractNumber { get; init; } = "";
    public string ProductType { get; init; } = "";
    public string Channel { get; init; } = "";
    public string Status { get; init; } = "";
    public DateTime ReceivedDate { get; init; }
    public DateTime? InfoRequestedDate { get; init; }
    public DateTime? InfoReceivedDate { get; init; }
    public DateTime? RespondedDate { get; init; }
    public string? Outcome { get; init; }
    public DateTime ResponseDueDate { get; init; }
    public int DaysRemaining { get; init; }
    public string RiskLevel { get; init; } = "";
    public string? AssignedTo { get; init; }
}

public sealed class CaseDetailRow
{
    public int CaseId { get; init; }
    public string CaseReference { get; init; } = "";
    public string CustomerName { get; init; } = "";
    public string CustomerEmail { get; init; } = "";
    public string ContractNumber { get; init; } = "";
    public string ProductType { get; init; } = "";
    public decimal Balance { get; init; }
    public string Channel { get; init; } = "";
    public string Reason { get; init; } = "";
    public string Status { get; init; } = "";
    public DateTime ReceivedDate { get; init; }
    public DateTime? InfoRequestedDate { get; init; }
    public DateTime? InfoReceivedDate { get; init; }
    public DateTime? RespondedDate { get; init; }
    public string? Outcome { get; init; }
    public int? ArrangementDays { get; init; }
    public DateTime? VariationNoticeSentDate { get; init; }
    public string? AssignedTo { get; init; }
    public DateTime InfoRequestDeadline { get; init; }
    public DateTime ResponseDueDate { get; init; }
    public string RuleApplied { get; init; } = "";
    public DateTime? VariationNoticeDueDate { get; init; }
    public int DaysRemaining { get; init; }
    public string RiskLevel { get; init; } = "";
}

public sealed class CaseEventRow
{
    public long EventId { get; init; }
    public string EventType { get; init; } = "";
    public string? Detail { get; init; }
    public string Actor { get; init; } = "";
    public DateTime OccurredAt { get; init; }
}

public sealed record CaseDetailResponse(CaseDetailRow Case, IReadOnlyList<CaseEventRow> Events);

public sealed class DashboardRow
{
    public int OpenCases { get; init; }
    public int Overdue { get; init; }
    public int Critical { get; init; }
    public int Warning { get; init; }
    public int AwaitingCustomer { get; init; }
    public int VariationNoticesPending { get; init; }
    public int RespondedLast90Days { get; init; }
    public int OnTimeLast90Days { get; init; }
    public decimal? AvgDaysToRespond { get; init; }
    public decimal? OnTimeRate => RespondedLast90Days == 0 ? null : Math.Round(100m * OnTimeLast90Days / RespondedLast90Days, 1);
}

public sealed class AlertRow
{
    public int AlertId { get; init; }
    public int CaseId { get; init; }
    public string CaseReference { get; init; } = "";
    public string CustomerName { get; init; } = "";
    public string AlertType { get; init; } = "";
    public string RiskLevel { get; init; } = "";
    public DateTime DueDate { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? AcknowledgedAt { get; init; }
    public string? AcknowledgedBy { get; init; }
    public string? AssignedTo { get; init; }
}

// ---------- Requests ----------

public sealed class CreateCaseRequest
{
    [Required, StringLength(200, MinimumLength = 2)] public string FullName { get; init; } = "";
    [Required, EmailAddress, StringLength(320)] public string Email { get; init; } = "";
    [Phone, StringLength(30)] public string? Phone { get; init; }
    [Required, RegularExpression(@"^[A-Z]{2}-\d{6}$", ErrorMessage = "Contract number must look like HL-123456.")]
    public string ContractNumber { get; init; } = "";
    [Required, AllowedValues("Home Loan", "Personal Loan", "Car Loan", "Credit Card", "BNPL")]
    public string ProductType { get; init; } = "";
    [Range(0, 100_000_000)] public decimal Balance { get; init; }
    [Required, AllowedValues("Phone", "Email", "Web", "Branch", "Broker")]
    public string Channel { get; init; } = "";
    [Required, StringLength(1000, MinimumLength = 5)] public string Reason { get; init; } = "";
    [Required] public DateOnly ReceivedDate { get; init; }
    [StringLength(100)] public string? AssignedTo { get; init; }
}

public sealed class RequestInformationRequest
{
    [Required] public DateOnly RequestDate { get; init; }
    [Required, StringLength(1000, MinimumLength = 5)] public string Details { get; init; } = "";
}

public sealed class InformationReceivedRequest
{
    [Required] public DateOnly ReceivedDate { get; init; }
}

public sealed class RecordResponseRequest
{
    [Required] public DateOnly RespondedDate { get; init; }
    [Required, AllowedValues("Approved", "Declined")] public string Outcome { get; init; } = "";
    [Range(1, 730)] public int? ArrangementDays { get; init; }
    [StringLength(1000)] public string? Notes { get; init; }
}

public sealed class VariationNoticeRequest
{
    [Required] public DateOnly SentDate { get; init; }
}
