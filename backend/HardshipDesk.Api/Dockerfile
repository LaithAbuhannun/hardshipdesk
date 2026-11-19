FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY HardshipDesk.Api/HardshipDesk.Api.csproj HardshipDesk.Api/
RUN dotnet restore HardshipDesk.Api/HardshipDesk.Api.csproj
COPY HardshipDesk.Api/ HardshipDesk.Api/
RUN dotnet publish HardshipDesk.Api/HardshipDesk.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
USER app
ENTRYPOINT ["dotnet", "HardshipDesk.Api.dll"]
