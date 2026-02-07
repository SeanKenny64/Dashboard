#!/usr/bin/env python3
"""
Terminal command executor for dashboard
Safely executes whitelisted commands (td, arena, etc.)
"""

import cgi
import json
import subprocess
import sys
import os

# Set content type for JSON response
print("Content-Type: application/json\n")

# Whitelist of allowed commands
ALLOWED_COMMANDS = ['td', 'tm' , 'ta', 't']

def execute_command(command):
    """
    Execute a whitelisted command and return output
    """
result = subprocess.run(
    f'source ~/.bashrc && {command}',
    shell=True,
    executable='/bin/bash',
    capture_output=True,
    text=True,
    timeout=5,
    cwd=os.path.expanduser("~")
)

    try:
        # Parse command
        parts = command.strip().split()
        if not parts:
            return {"error": "Empty command"}
        
        cmd_name = parts[0]
        
        # Security check: only allow whitelisted commands
        if cmd_name not in ALLOWED_COMMANDS:
            return {"error": f"Command '{cmd_name}' not allowed. Allowed: {', '.join(ALLOWED_COMMANDS)}"}
        
        # Execute command
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=5,  # 5 second timeout
            cwd=os.path.expanduser("~")  # Run in home directory
        )
        
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
        
    except subprocess.TimeoutExpired:
        return {"error": "Command timed out"}
    except Exception as e:
        return {"error": f"Execution error: {str(e)}"}

def main():
    try:
        # Get POST data
        form = cgi.FieldStorage()
        command = form.getvalue('command', '')
        
        if not command:
            print(json.dumps({"error": "No command provided"}))
            return
        
        # Execute and return result
        result = execute_command(command)
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": f"Server error: {str(e)}"}))

if __name__ == "__main__":
    main()
