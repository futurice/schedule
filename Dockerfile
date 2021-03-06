FROM ubuntu:16.04

WORKDIR /opt/app/

RUN apt-get update && apt-get install -y \
    python \
    build-essential \
    python-pip \
    libpq-dev \
    libffi-dev \
    npm \
    wget \
    curl \
    vim \
    git \
    supervisor \
    nginx-full \
    pdftk \
    texlive \
    texlive-xetex \
    texlive-luatex \
    redis-server

RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -
RUN apt-get install -y nodejs

COPY package.json /opt/package.json
RUN npm install

COPY .bowerrc /opt/app/.bowerrc
COPY bower.json /opt/app/bower.json
RUN /opt/node_modules/bower/bin/bower install --allow-root

COPY req.txt /opt/req.txt
RUN pip install -r /opt/req.txt

RUN groupadd -r schedule_group && useradd -r -g schedule_group schedule_user
RUN chown schedule_user /opt/app
RUN ln -s /etc/nginx/uwsgi_params /etc/nginx/sites-enabled/
RUN mkdir /opt/static/futuschedule/css
COPY schedulesite/futuschedule/static/futuschedule/css/style.css /opt/static/futuschedule/css/style.css

COPY pdf-generator/fonts/* /usr/share/fonts/
RUN mkdir /opt/download

ENV DJANGO_SETTINGS_MODULE schedulesite.settings
ENV UWSGI_PARAMS ""

ENV CELERY_LOG_LEVEL DEBUG
ENV PYTHONPATH /opt/app/:/opt/app/schedulesite/

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/supervisord.conf

COPY . /opt/app/
EXPOSE 8000

CMD ["bash", "docker/start.sh"]
