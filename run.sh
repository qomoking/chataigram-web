  curl 'https://aiapi.wdabuliu.com/api/feed?offset=0&limit=30&sort_mode=random' \
    -H 'content-type: application/json' \
    | python3 -c "
import sys, json
d = json.load(sys.stdin)
for p in d.get('posts', [])[:5]:
    print(p.get('id'), repr(p.get('photo_url')))
"
