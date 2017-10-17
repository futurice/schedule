#!/usr/bin/bash
./schedulesite/manage.py migrate --noinput
../node_modules/react-tools/bin/jsx schedulesite/futuschedule/static/futuschedule/js/src/ /opt/static/futuschedule/js/build

# Docker Secrets
APP_DIR=/opt/app/
PDFGEN=/opt/pdf-generator/
mkdir -p /opt/pdf-generator/fonts
cp -r ${APP_DIR}pdf-generator/* $PDFGEN
if [[ "$USE_SECRET_FILES" == "true" ]]; then
    cp /run/secrets/bold.otf ${PDFGEN}fonts/
    cp /run/secrets/font.otf ${PDFGEN}fonts/
    cp /run/secrets/intro_background.pdf ${PDFGEN}
    cp /run/secrets/client_secrets.json $APP_DIR
fi

env

if [[ "$TEST" == "true" ]]; then
    apt-get update -y
    apt-get install -y firefox xvfb libnss3-dev libgconf-2-4
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
    echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list
    apt-get update -y
    apt-get install -y google-chrome-stable

    curl -L https://github.com/mozilla/geckodriver/releases/download/v0.19.0/geckodriver-v0.19.0-linux64.tar.gz -o /tmp/geckodriver.tar
    tar -xzvf /tmp/geckodriver.tar -C /usr/bin/
    chmod +rx /usr/bin/geckodriver

    curl -L https://chromedriver.storage.googleapis.com/2.33/chromedriver_linux64.zip -o /tmp/chromedriver.zip
    unzip /tmp/chromedriver.zip -d /usr/bin/
    chmod +rx /usr/bin/chromedriver
fi

/usr/bin/supervisord -c /etc/supervisor/supervisord.conf
