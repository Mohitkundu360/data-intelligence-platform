"""Synthetic development data. Every page says so; source URLs use the fixture:// scheme."""
_HDR = "FIXTURE DATA - synthetic, for development only.\n"

FIXTURE_PAGES: dict[str, str] = {
    "fixture://jobs-board-a": _HDR
    + "\n".join([
        "company_name: Acme Technologies | job_title: Backend Engineer | location: Bengaluru | salary: INR 12-18 LPA | application_url: https://acme.example/careers/101",
        "company_name: Northwind Labs | job_title: Python Developer | location: Remote | application_url: https://northwind.example/jobs/7",
        "company_name: Zenith Systems | job_title: Backend Engineer | location: Pune | salary: INR 15-22 LPA | application_url: https://zenith.example/jobs/44",
        "company_name: Orbit Cloud | location: Hyderabad | application_url: https://orbit.example/jobs/9",
    ]),
    "fixture://jobs-board-b": _HDR
    + "\n".join([
        "company_name: Acme Technologies Pvt Ltd | job_title: Backend Engineer | location: Bengaluru | application_url: https://acme.example/careers/101",
        "company_name: Kite Software | job_title: Senior Backend Engineer | location: Chennai | salary: INR 25-35 LPA | application_url: https://kite.example/jobs/3",
        "company_name: Lumen Data | job_title: Backend Engineer | location: Gurugram | application_url: https://lumen.example/jobs/12",
    ]),
    "fixture://company-careers-c": _HDR
    + "\n".join([
        "company_name: Pixel Forge | job_title: Backend Engineer | location: Mumbai | salary: INR 10-14 LPA | application_url: https://pixelforge.example/careers/5",
        "company_name: Northwind Labs | job_title: Python Developer | location: Remote | application_url: https://northwind.example/jobs/7",
    ]),
}
