import os

# Must be set before the app is imported.
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["DEV_FIXTURES"] = "true"
os.environ["GEMINI_API_KEY"] = ""
