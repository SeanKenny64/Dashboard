#!/usr/bin/env python3
import json
import urllib.request
import xml.etree.ElementTree as ET
import sys

# Add your RSS URLs here
FEEDS = [
    "https://hnrss.org/frontpage", # Hacker News
    "https://www.theregister.com/security/headlines.atom",
    "https://feeds.bbci.co.uk/news/technology/rss.xml"
]

def fetch_feed(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            content = response.read()
        
        root = ET.fromstring(content)
        items = []
        
        # Handle standard RSS 2.0
        for item in root.findall('.//item')[:5]:
            title = item.findtext('title') or 'No title'
            link = item.findtext('link') or '#'
            items.append({'title': title, 'link': link})
            
        # Handle Atom feeds
        if not items:
            ns = {'a': 'http://www.w3.org/2005/Atom'}
            for entry in root.findall('.//a:entry', ns)[:5]:
                title = entry.findtext('a:title', namespaces=ns) or 'No title'
                link_el = entry.find('a:link', namespaces=ns)
                link = link_el.get('href') if link_el is not None else '#'
                items.append({'title': title, 'link': link})
                
        return items
    except Exception as e:
        return [{'title': f'Error loading {url}', 'link': '#'}]

def main():
    print("Content-Type: application/json\n")
    all_items = []
    for url in FEEDS:
        all_items.extend(fetch_feed(url))
    
    # Sort or just print them
    print(json.dumps(all_items))

if __name__ == "__main__":
    main()