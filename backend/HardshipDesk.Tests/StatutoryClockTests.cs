using HardshipDesk.Api.Domain;
using Xunit;

namespace HardshipDesk.Tests;

public class StatutoryClockTests
{
    private static readonly DateOnly Received = new(2026, 11, 2);

    [Fact]
    public void No_information_requested_response_due_21_days_after_notice()
    {
        var result = StatutoryClock.Calculate(new ClockInput(Received, null, null, null), today: Received);

        Assert.Equal(new DateOnly(2026, 11, 23), result.ResponseDueDate);
        Assert.Equal(new DateOnly(2026, 11, 23), result.InfoRequestDeadline);
        Assert.Equal(21, result.DaysRemaining);
        Assert.Equal(RiskLevel.OnTrack, result.Risk);
    }

    [Fact]
    public void Information_received_restarts_21_day_clock_from_receipt_of_information()
    {
        var requested = Received.AddDays(5);
        var infoReceived = Received.AddDays(12);

        var result = StatutoryClock.Calculate(new ClockInput(Received, requested, infoReceived, null), today: infoReceived);

        Assert.Equal(infoReceived.AddDays(21), result.ResponseDueDate);
        Assert.Contains("information was received", result.RuleApplied);
    }

    [Fact]
    public void Information_requested_but_never_received_response_due_28_days_after_request()
    {
        var requested = Received.AddDays(5);

        var result = StatutoryClock.Calculate(new ClockInput(Received, requested, null, null), today: requested);

        Assert.Equal(requested.AddDays(28), result.ResponseDueDate);
        Assert.Contains("28 days", result.RuleApplied);
    }

    [Theory]
    [InlineData(10, RiskLevel.OnTrack)]
    [InlineData(8, RiskLevel.OnTrack)]
    [InlineData(7, RiskLevel.Warning)]
    [InlineData(4, RiskLevel.Warning)]
    [InlineData(3, RiskLevel.Critical)]
    [InlineData(0, RiskLevel.Critical)]
    [InlineData(-1, RiskLevel.Overdue)]
    public void Open_cases_are_classified_by_days_remaining(int daysRemaining, RiskLevel expected)
    {
        Assert.Equal(expected, StatutoryClock.ClassifyRisk(respondedDate: null, daysRemaining));
    }

    [Fact]
    public void Response_on_the_due_date_is_met()
    {
        var due = Received.AddDays(21);

        var result = StatutoryClock.Calculate(new ClockInput(Received, null, null, due), today: due.AddDays(30));

        Assert.Equal(RiskLevel.Met, result.Risk);
        Assert.Equal(0, result.DaysRemaining);
    }

    [Fact]
    public void Response_one_day_late_is_a_breach_even_after_the_case_is_closed()
    {
        var late = Received.AddDays(22);

        var result = StatutoryClock.Calculate(new ClockInput(Received, null, null, late), today: late.AddDays(60));

        Assert.Equal(RiskLevel.Breached, result.Risk);
        Assert.Equal(-1, result.DaysRemaining);
    }

    [Fact]
    public void Information_request_on_day_21_is_allowed()
    {
        Assert.Null(StatutoryClock.ValidateInformationRequest(Received, Received.AddDays(21)));
    }

    [Fact]
    public void Information_request_after_day_21_is_rejected()
    {
        var error = StatutoryClock.ValidateInformationRequest(Received, Received.AddDays(22));

        Assert.NotNull(error);
        Assert.Contains("21 days", error);
    }

    [Fact]
    public void Information_request_before_notice_is_rejected()
    {
        Assert.NotNull(StatutoryClock.ValidateInformationRequest(Received, Received.AddDays(-1)));
    }

    [Theory]
    [InlineData(90, false)]
    [InlineData(91, true)]
    [InlineData(180, true)]
    public void Variation_notice_required_only_for_arrangements_longer_than_90_days(int arrangementDays, bool required)
    {
        var agreed = new DateOnly(2026, 11, 10);

        var due = StatutoryClock.VariationNoticeDueDate(agreed, arrangementDays);

        Assert.Equal(required, due.HasValue);
        if (required)
        {
            Assert.Equal(agreed.AddDays(30), due);
        }
    }
}
