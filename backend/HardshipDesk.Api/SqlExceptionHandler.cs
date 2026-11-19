using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace HardshipDesk.Api;

/// <summary>
/// Turns the business-rule errors raised by stored procedures (THROW 50xxx) into clean 4xx responses.
/// Anything else becomes a generic 500 without leaking SQL details to the client.
/// </summary>
public sealed class SqlExceptionHandler(ILogger<SqlExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not SqlException sql)
        {
            return false;
        }

        ProblemDetails problem;
        if (sql.Number == 50404)
        {
            problem = new ProblemDetails { Status = StatusCodes.Status404NotFound, Title = "Not found", Detail = sql.Message };
        }
        else if (sql.Number is >= 50000 and < 50404)
        {
            problem = new ProblemDetails { Status = StatusCodes.Status409Conflict, Title = "Business rule", Detail = sql.Message };
        }
        else
        {
            logger.LogError(sql, "Database error {Number}", sql.Number);
            problem = new ProblemDetails { Status = StatusCodes.Status500InternalServerError, Title = "Something went wrong" };
        }

        context.Response.StatusCode = problem.Status!.Value;
        await context.Response.WriteAsJsonAsync(problem, cancellationToken);
        return true;
    }
}
