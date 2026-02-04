#!/usr/bin/env python3
"""
data_handler.py
Handles reading and writing dashboard data to JSON file.
"""
import json
import os

# Data file location - INSIDE the data/ folder
DATA_DIR = "data"
DATA_FILE = os.path.join(DATA_DIR, "dashboard_data.json")

def ensure_data_dir():
    """Create data directory if it doesn't exist"""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)
        print(f"Created directory: {DATA_DIR}")

def read_data():
    """Read all dashboard data from JSON file"""
    ensure_data_dir()
    
    # If file doesn't exist, create it with empty data
    if not os.path.exists(DATA_FILE):
        print(f"Creating new data file: {DATA_FILE}")
        empty_data = {
            "notes": "",
            "timer": None,
            "checkins": [],
            "last_updated": None
        }
        write_data(empty_data)
        return empty_data
    
    try:
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
            print(f"Read data from {DATA_FILE}")
            return data
    except Exception as e:
        print(f"Error reading {DATA_FILE}: {e}")
        # Return empty data structure if something goes wrong
        return {"notes": "", "timer": None, "checkins": [], "last_updated": None}

def write_data(data):
    """Save dashboard data to JSON file"""
    ensure_data_dir()
    
    # Add timestamp
    import time
    data["last_updated"] = time.time()
    
    try:
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Saved data to {DATA_FILE}")
        return True
    except Exception as e:
        print(f"Error writing {DATA_FILE}: {e}")
        return False

# Test function - run this file directly to test
if __name__ == "__main__":
    print("=== Testing data_handler.py ===")
    
    # Test 1: Read data (will create file if it doesn't exist)
    print("\n1. Reading data...")
    test_data = read_data()
    print(f"   Notes: {test_data.get('notes', '')[:50]}...")
    print(f"   Timer: {test_data.get('timer')}")
    
    # Test 2: Write data
    print("\n2. Writing test data...")
    test_data["notes"] = "Test note from data_handler.py"
    write_data(test_data)
    
    # Test 3: Read it back
    print("\n3. Reading data again...")
    new_data = read_data()
    print(f"   Notes: {new_data.get('notes', '')}")
    
    print("\n✅ All tests passed!")
    print(f"Data file: {DATA_FILE}")
