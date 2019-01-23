# Druid console

## How to run

1. Make sure you have nginx installed

2. Add this to your nginx config

```
    server {
        listen       18081;
        server_name  localhost;

        location /status {
            proxy_pass http://<your-router-ip>:8888;
        }

        location /druid/ {
            proxy_pass http://<your-router-ip>:8888;
        }

        location / {
            root /<path/to/your>/druid/web-console;
            index index.html;
        }
    }
```

3. Run `npm run watch`

## How to watch and run (alternative method)

1. Run `npm start`

2. That's it.

## List of non SQL APIs used

```
GET /status
GET /druid/indexer/v1/supervisor?full
GET /druid/indexer/v1/workers
GET /druid/coordinator/v1/loadqueue?simple
```
