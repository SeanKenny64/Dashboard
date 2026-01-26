#!/usr/bin/env python3
# cgi-bin/arena.py
#
# CGI wrapper to run tw_arena.py and show its output.

import cgitb
import subprocess
import html

cgitb.enable()  # show errors in browser if something breaks

# Absolute paths to your Python and tw_arena script:
PYTHON = "/home/sean/Projects/myenv/bin/python3"
TW_ARENA = "/home/sean/Projects/tw_arena/tw_arena.py"

def run_arena():
    try:
        result = subprocess.run(
            [PYTHON, TW_ARENA],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode != 0:
            return f"Error running tw_arena.py (exit {result.returncode}):\n{result.stderr}"
        return result.stdout
    except Exception as e:
        return f"Exception running tw_arena.py: {e}"

def main():
    output = run_arena()
    escaped = html.escape(output)

    print("Content-Type: text/html")
    print()  # end headers
    print("""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Arena</title>
  <style>
    body {
      background: #111;
      color: #eee;
      font-family: monospace;
      margin: 0;
      padding: 0.5rem;
      font-size: 0.9rem;
    }
    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      margin: 0;
    }
  </style>
</head>
<body>
<pre>""")
    print(escaped)
    print("</pre></body></html>")

if __name__ == "__main__":
    main()
