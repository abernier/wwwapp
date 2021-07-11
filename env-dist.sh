wwwapp_env="production"

wwwapp_www_host__protocol="http"
wwwapp_www_host__hostname="localhost"
wwwapp_www_host__port="3000"

wwwapp_www_proxy__port="8888"

wwwapp_www_nodedebug__port="9229"

#

wwwapp_www_static_maxage="31536000"

# Auth cookie
	
wwwapp_www_authcookie_name="WwwappAuthSession"
wwwapp_www_authcookie_timeout_seconds="31536000"
wwwapp_www_authcookie_secret="shhhht"
wwwapp_www_authcookie_sliding="true"

# Social

wwwapp_facebook_client_id="1497478383684635"
wwwapp_facebook_client_secret="*******"
wwwapp_facebook_redirect_uri="http://localhost:3000/sessions/facebook/callback"
	
wwwapp_google_client_id="300627686439-vc18nmli89itqn16etp8l4c68bsuhfd7.apps.googleusercontent.com"
wwwapp_google_client_secret="*******"
wwwapp_google_redirect_uri="http://localhost:3000/sessions/google/callback"

# SMTP

wwwapp_smtp_uri__protocol="smtp"
wwwapp_smtp_uri__slashes="true"
wwwapp_smtp_uri__hostname="mailcatcher"
wwwapp_smtp_uri__port="25"

# Inbox

wwwapp_inbox_uri__protocol="http"
wwwapp_inbox_uri__hostname="mailcatcher"
wwwapp_inbox_uri__port="80"

# Mailer

wwwapp_www_mailer_fromname=""
wwwapp_www_mailer_email=""

wwwapp_welcomemail="true"
wwwapp_justconfirmedemail="true"

# Postgres

wwwapp_postgres_uri__protocol="postgres"
wwwapp_postgres_uri__slashes="true"
wwwapp_postgres_uri__auth="postgres"
wwwapp_postgres_uri__hostname="postgres"
wwwapp_postgres_uri__port="5432"
wwwapp_postgres_uri__pathname="/wwwapp"

# Redis

wwwapp_redis_uri__protocol="redis"
wwwapp_redis_uri__slashes="true"
wwwapp_redis_uri__hostname="redis"
wwwapp_redis_uri__port="6379"

# Selenium

wwwapp_selenium_hub__protocol="http"
wwwapp_selenium_hub__hostname="selenium-hub"
wwwapp_selenium_hub__port="4444"
wwwapp_selenium_hub__pathname="/wd/hub"

wwwapp_selenium_concurrent="2"

wwwapp_selenium_capabilities__0__browserName="chrome"

# lists

# wwwapp_lists__currencies__0__acronym="EUR"
# wwwapp_lists__currencies__0__symbol="€"
# wwwapp_lists__currencies__1__acronym="USD"
# wwwapp_lists__currencies__1__symbol="$"

# wwwapp_lists__iou_amount_min="100"

