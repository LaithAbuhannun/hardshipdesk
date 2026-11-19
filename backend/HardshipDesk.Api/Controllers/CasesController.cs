using HardshipDesk.Api.Data;
using HardshipDesk.Api.Domain;
using HardshipDesk.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace HardshipDesk.Api.Controllers;

[ApiController]
[Route("api/cases")]
public sealed class CasesController(ICaseRepository cases, IBusinessClock clock) : ControllerBase
{
    private static readonly HashSet<string> Statuses = ["Open", "InfoRequested", "InfoReceived", "Responded"];
    private static readonly HashSet<string> Risks = ["OnTrack", "Warning", "Critical", "Overdue", "Met", "Breached"];

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CaseSummaryRow>>> List(
        [FromQuery] string? status, [FromQuery] string? risk, [FromQuery] string? search)
    {
        if (status is not null && !Statuses.Contains(status)) return BadRequest(Invalid("Unknown status."));
        if (risk is not null && !Risks.Contains(risk)) return BadRequest(Invalid("Unknown risk level."));
        if (search is { Length: > 100 }) return BadRequest(Invalid("Search text is too long."));

        return Ok(await cases.GetCasesAsync(clock.Today, status, risk, search));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CaseDetailResponse>> Get(int id)
    {
        var result = await cases.GetCaseAsync(id, clock.Today);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult> Create(CreateCaseRequest request)
    {
        if (request.ReceivedDate > clock.Today)
        {
            return ValidationProblem(Field(nameof(request.ReceivedDate), "The received date cannot be in the future."));
        }

        var id = await cases.CreateCaseAsync(request, Actor);
        return CreatedAtAction(nameof(Get), new { id }, new { caseId = id });
    }

    [HttpPost("{id:int}/request-information")]
    public async Task<ActionResult> RequestInformation(int id, RequestInformationRequest request)
    {
        var existing = await cases.GetCaseAsync(id, clock.Today);
        if (existing is null) return NotFound();

        // Check the statutory window here too so the user gets a clear message before hitting the database rule.
        var error = StatutoryClock.ValidateInformationRequest(DateOnly.FromDateTime(existing.Case.ReceivedDate), request.RequestDate);
        if (error is not null) return ValidationProblem(Field(nameof(request.RequestDate), error));

        await cases.RequestInformationAsync(id, request, Actor);
        return NoContent();
    }

    [HttpPost("{id:int}/information-received")]
    public async Task<ActionResult> InformationReceived(int id, InformationReceivedRequest request)
    {
        if (request.ReceivedDate > clock.Today)
            return ValidationProblem(Field(nameof(request.ReceivedDate), "The date cannot be in the future."));

        await cases.RecordInformationReceivedAsync(id, request, Actor);
        return NoContent();
    }

    [HttpPost("{id:int}/response")]
    public async Task<ActionResult> RecordResponse(int id, RecordResponseRequest request)
    {
        if (request.RespondedDate > clock.Today)
            return ValidationProblem(Field(nameof(request.RespondedDate), "The date cannot be in the future."));
        if (request.Outcome == "Approved" && request.ArrangementDays is null)
            return ValidationProblem(Field(nameof(request.ArrangementDays), "Enter how many days the arrangement lasts."));

        await cases.RecordResponseAsync(id, request, Actor);
        return NoContent();
    }

    [HttpPost("{id:int}/variation-notice")]
    public async Task<ActionResult> VariationNotice(int id, VariationNoticeRequest request)
    {
        await cases.RecordVariationNoticeAsync(id, request, Actor);
        return NoContent();
    }

    // Authentication is out of scope for the demo; in production this comes from the signed-in user's claims.
    private string Actor => User.Identity?.Name ?? "demo.user";

    private static ProblemDetails Invalid(string detail) => new() { Title = "Invalid request", Detail = detail };

    private ValidationProblemDetails Field(string field, string message)
    {
        var problem = new ValidationProblemDetails(new Dictionary<string, string[]> { [field] = [message] });
        problem.Status = StatusCodes.Status400BadRequest;
        return problem;
    }
}
