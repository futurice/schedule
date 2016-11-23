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
    nginx-full

RUN curl -sL https://deb.nodesource.com/setup_6.x | bash -
RUN apt-get install -y nodejs

COPY req.txt /opt/req.txt
RUN pip install -r /opt/req.txt

COPY package.json /opt/package.json
RUN npm install

COPY .bowerrc /opt/app/.bowerrc
COPY bower.json /opt/app/bower.json
RUN /opt/node_modules/bower/bin/bower install --allow-root

COPY . /opt/app/

EXPOSE 8000

ENV DJANGO_SETTINGS_MODULE schedulesite.settings_docker
ENV UWSGI_PARAMS ""

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/supervisord.conf

CMD ["bash", "docker/start.sh"]