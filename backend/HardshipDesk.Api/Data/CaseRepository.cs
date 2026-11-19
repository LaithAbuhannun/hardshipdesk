using System.Data;
using Dapper;
using HardshipDesk.Api.Models;
using Microsoft.Data.SqlClient;

namespace HardshipDesk.Api.Data;

public interface IDbConnectionFactory
{
    SqlConnection Create();
}

public sealed class SqlConnectionFactory(string connectionString) : IDbConnectionFactory
{
    public SqlConnection Create() => new(connectionString);
}

public interface ICaseRepository
{
    Task<IReadOnlyList<CaseSummaryRow>> GetCasesAsync(DateOnly today, string? status, string? risk, string? search);
    Task<CaseDetailResponse?> GetCaseAsync(int caseId, DateOnly today);
    Task<int> CreateCaseAsync(CreateCaseRequest request, string actor);
    Task RequestInformationAsync(int caseId, RequestInformationRequest request, string actor);
    Task RecordInformationReceivedAsync(int caseId, InformationReceivedRequest request, string actor);
    Task RecordResponseAsync(int caseId, RecordResponseRequest request, string actor);
    Task RecordVariationNoticeAsync(int caseId, VariationNoticeRequest request, string actor);
    Task<DashboardRow> GetDashboardAsync(DateOnly today);
    Task<int> FlagAtRiskCasesAsync(DateOnly today);
    Task<IReadOnlyList<AlertRow>> GetAlertsAsync(bool includeAcknowledged);
    Task AcknowledgeAlertAsync(int alertId, string actor);
}

/// <summary>
/// All data access goes through parameterised stored procedures: no SQL is built from user input.
/// </summary>
public sealed class CaseRepository(IDbConnectionFactory connections) : ICaseRepository
{
    private const CommandType Proc = CommandType.StoredProcedure;

    public async Task<IReadOnlyList<CaseSummaryRow>> GetCasesAsync(DateOnly today, string? status, string? risk, string? search)
    {
        var p = new DynamicParameters();
        p.Add("@Today", ToDate(today), DbType.Date);
        p.Add("@Status", Blank(status));
        p.Add("@Risk", Blank(risk));
        p.Add("@Search", Blank(search));

        await using var db = connections.Create();
        var rows = await db.QueryAsync<CaseSummaryRow>("dbo.usp_GetCases", p, commandType: Proc);
        return rows.AsList();
    }

    public async Task<CaseDetailResponse?> GetCaseAsync(int caseId, DateOnly today)
    {
        var p = new DynamicParameters();
        p.Add("@CaseId", caseId);
        p.Add("@Today", ToDate(today), DbType.Date);

        await using var db = connections.Create();
        using var grid = await db.QueryMultipleAsync("dbo.usp_GetCaseById", p, commandType: Proc);
        var detail = await grid.ReadSingleOrDefaultAsync<CaseDetailRow>();
        if (detail is null)
        {
            return null;
        }

        var events = (await grid.ReadAsync<CaseEventRow>()).AsList();
        return new CaseDetailResponse(detail, events);
    }

    public async Task<int> CreateCaseAsync(CreateCaseRequest r, string actor)
    {
        var p = new DynamicParameters();
        p.Add("@FullName", r.FullName.Trim());
        p.Add("@Email", r.Email.Trim().ToLowerInvariant());
        p.Add("@Phone", Blank(r.Phone));
        p.Add("@ContractNumber", r.ContractNumber);
        p.Add("@ProductType", r.ProductType);
        p.Add("@Balance", r.Balance);
        p.Add("@Channel", r.Channel);
        p.Add("@Reason", r.Reason.Trim());
        p.Add("@ReceivedDate", ToDate(r.ReceivedDate), DbType.Date);
        p.Add("@AssignedTo", Blank(r.AssignedTo));
        p.Add("@Actor", actor);

        await using var db = connections.Create();
        return await db.ExecuteScalarAsync<int>("dbo.usp_CreateCase", p, commandType: Proc);
    }

    public async Task RequestInformationAsync(int caseId, RequestInformationRequest r, string actor)
    {
        var p = new DynamicParameters();
        p.Add("@CaseId", caseId);
        p.Add("@RequestDate", ToDate(r.RequestDate), DbType.Date);
        p.Add("@Details", r.Details.Trim());
        p.Add("@Actor", actor);
        await ExecuteAsync("dbo.usp_RequestInformation", p);
    }

    public async Task RecordInformationReceivedAsync(int caseId, InformationReceivedRequest r, string actor)
    {
        var p = new DynamicParameters();
        p.Add("@CaseId", caseId);
        p.Add("@ReceivedDate", ToDate(r.ReceivedDate), DbType.Date);
        p.Add("@Actor", actor);
        await ExecuteAsync("dbo.usp_RecordInformationReceived", p);
    }

    public async Task RecordResponseAsync(int caseId, RecordResponseRequest r, string actor)
    {
        var p = new DynamicParameters();
        p.Add("@CaseId", caseId);
        p.Add("@RespondedDate", ToDate(r.RespondedDate), DbType.Date);
        p.Add("@Outcome", r.Outcome);
        p.Add("@ArrangementDays", r.ArrangementDays);
        p.Add("@Notes", Blank(r.Notes));
        p.Add("@Actor", actor);
        await ExecuteAsync("dbo.usp_RecordResponse", p);
    }

    public async Task RecordVariationNoticeAsync(int caseId, VariationNoticeRequest r, string actor)
    {
        var p = new DynamicParameters();
        p.Add("@CaseId", caseId);
        p.Add("@SentDate", ToDate(r.SentDate), DbType.Date);
        p.Add("@Actor", actor);
        await ExecuteAsync("dbo.usp_RecordVariationNotice", p);
    }

    public async Task<DashboardRow> GetDashboardAsync(DateOnly today)
    {
        var p = new DynamicParameters();
        p.Add("@Today", ToDate(today), DbType.Date);

        await using var db = connections.Create();
        return await db.QuerySingleAsync<DashboardRow>("dbo.usp_GetDashboard", p, commandType: Proc);
    }

    public async Task<int> FlagAtRiskCasesAsync(DateOnly today)
    {
        var p = new DynamicParameters();
        p.Add("@Today", ToDate(today), DbType.Date);

        await using var db = connections.Create();
        return await db.ExecuteScalarAsync<int>("dbo.usp_FlagAtRiskCases", p, commandType: Proc);
    }

    public async Task<IReadOnlyList<AlertRow>> GetAlertsAsync(bool includeAcknowledged)
    {
        await using var db = connections.Create();
        var rows = await db.QueryAsync<AlertRow>("dbo.usp_GetAlerts", new { IncludeAcknowledged = includeAcknowledged }, commandType: Proc);
        return rows.AsList();
    }

    public async Task AcknowledgeAlertAsync(int alertId, string actor) =>
        await ExecuteAsync("dbo.usp_AcknowledgeAlert", new { AlertId = alertId, Actor = actor });

    private async Task ExecuteAsync(string procedure, object parameters)
    {
        await using var db = connections.Create();
        await db.ExecuteAsync(procedure, parameters, commandType: Proc);
    }

    private static DateTime ToDate(DateOnly date) => date.ToDateTime(TimeOnly.MinValue);

    private static string? Blank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
