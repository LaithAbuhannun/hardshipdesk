using System.Text.Json.Serialization;
using Microsoft.AspNetCore.RateLimiting;
using Hangfire;
using HardshipDesk.Api;
using HardshipDesk.Api.Data;
using HardshipDesk.Api.Domain;
using HardshipDesk.Api.Jobs;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("HardshipDesk")
    ?? throw new InvalidOperationException("Connection string 'HardshipDesk' is missing.");

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IBusinessClock, SydneyBusinessClock>();
builder.Services.AddSingleton<IDbConnectionFactory>(new SqlConnectionFactory(connectionString));
builder.Services.AddScoped<ICaseRepository, CaseRepository>();
builder.Services.AddScoped<DeadlineMonitorJob>();

builder.Services
    .AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<SqlExceptionHandler>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var allowedOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddPolicy("web", p => p.WithOrigins(allowedOrigins).AllowAnyHeader().WithMethods("GET", "POST")));

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddFixedWindowLimiter("api", l =>
    {
        l.PermitLimit = 120;
        l.Window = TimeSpan.FromMinutes(1);
        l.QueueLimit = 0;
    });
});

// Hangfire stores its jobs in the same SQL Server database (its own HangFire schema).
builder.Services.AddHangfire(cfg => cfg
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(connectionString));
builder.Services.AddHangfireServer();

var app = builder.Build();

app.UseExceptionHandler();

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    await next();
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    // Local requests only by default.
    app.UseHangfireDashboard("/hangfire");
}
else
{
    app.UseHsts();
}

app.UseCors("web");
app.UseRateLimiter();
app.MapControllers().RequireRateLimiting("api");
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Services.GetRequiredService<IRecurringJobManager>().AddOrUpdate<DeadlineMonitorJob>(
    DeadlineMonitorJob.RecurringJobId,
    job => job.RunAsync(),
    "0 8 * * *",
    new RecurringJobOptions { TimeZone = SydneyBusinessClock.TimeZone });

app.Run();

public partial class Program { }
