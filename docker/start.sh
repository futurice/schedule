#!/usr/bin/bash
./schedulesite/manage.py migrate --noinput
../node_modules/react-tools/bin/jsx schedulesite/futuschedule/static/futuschedule/js/src/ /opt/static/futuschedule/js/build

# Docker Secrets
APP_DIR=/opt/app/
if [[ "$USE_SECRET_FILES" == "true" ]]; then
    cp /run/secrets/bold.otf $APP_DIR
    cp /run/secrets/font.otf $APP_DIR
    cp /run/secrets/intro_background.pdf $APP_DIR
    cp /run/secrets/client_secrets.json $APP_DIR
fi

/usr/bin/supervisord -c /etc/supervisor/supervisord.conf
