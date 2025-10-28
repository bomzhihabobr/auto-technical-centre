import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get the token
token = os.getenv("TELEGRAM_API_KEY")

# Print debug information
print(f"Token length: {len(token) if token else 0} characters")
print(f"Token starts with: {token[:5] if token else 'None'}")
print(f"Token ends with: {token[-5:] if token else 'None'}")
print(f"Full token: {token}")

# Check for hidden characters
if token:
    print("Character codes:", [ord(c) for c in token])
