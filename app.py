import urllib.request
import xml.etree.ElementTree as ET
import re
import html
import time
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_DURATION = 300  # 5 minutes in seconds

# Simple in-memory cache
cache = {
    "data": None,
    "last_fetched": 0
}

def clean_html_to_text(html_content):
    """Strip HTML tags and unescape entities for plain-text representations (e.g. Tweets)."""
    # Replace common HTML block elements with spaces/newlines
    text = re.sub(r'</?(p|div|h3|h4|br|li)[^>]*>', ' ', html_content)
    # Strip any remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Unescape HTML entities
    text = html.unescape(text)
    # Replace multiple spaces with a single space
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def fetch_and_parse_feed():
    req = urllib.request.Request(
        FEED_URL, 
        headers={'User-Agent': 'BigQuery-Release-Notes-Web-App/1.0'}
    )
    with urllib.request.urlopen(req) as response:
        data = response.read()
    
    root = ET.fromstring(data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = root.findall('atom:entry', ns)
    parsed_updates = []
    
    for entry in entries:
        date_str = entry.find('atom:title', ns).text
        updated = entry.find('atom:updated', ns).text
        
        link_elem = entry.find("atom:link[@rel='alternate']", ns)
        base_link = link_elem.attrib.get('href') if link_elem is not None else FEED_URL
        
        content_html = entry.find('atom:content', ns).text
        if not content_html:
            continue
            
        # Split by h3 headers to separate multiple updates in a single day
        parts = re.split(r'(<h3[^>]*>.*?</h3>)', content_html, flags=re.IGNORECASE)
        
        sub_updates = []
        if parts[0].strip():
            sub_updates.append({
                'type': 'Update',
                'html': parts[0].strip()
            })
            
        for idx in range(1, len(parts), 2):
            header = parts[idx]
            body = parts[idx+1] if idx+1 < len(parts) else ""
            
            # Extract header text (e.g. "Feature", "Announcement")
            header_text = re.sub(r'<[^>]+>', '', header).strip()
            sub_updates.append({
                'type': header_text,
                'html': body.strip()
            })
            
        # Add to main list with a unique ID for each sub-update
        for index, update in enumerate(sub_updates):
            clean_text = clean_html_to_text(update['html'])
            
            # Formulate a stable unique ID
            safe_date = re.sub(r'\W+', '_', date_str)
            unique_id = f"bq_{safe_date}_{index}"
            
            parsed_updates.append({
                'id': unique_id,
                'date': date_str,
                'updated_raw': updated,
                'link': base_link,
                'type': update['type'],
                'html': update['html'],
                'text': clean_text
            })
            
    return parsed_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    if force_refresh or not cache["data"] or (now - cache["last_fetched"] > CACHE_DURATION):
        try:
            cache["data"] = fetch_and_parse_feed()
            cache["last_fetched"] = now
        except Exception as e:
            # If fetch fails but we have cached data, return cached data with error warning
            if cache["data"]:
                return jsonify({
                    'status': 'warning',
                    'error': str(e),
                    'releases': cache["data"],
                    'cached_at': cache["last_fetched"]
                })
            return jsonify({'status': 'error', 'message': str(e)}), 500
            
    return jsonify({
        'status': 'success',
        'releases': cache["data"],
        'cached_at': cache["last_fetched"]
    })

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
