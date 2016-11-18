[![Build Status](https://travis-ci.org/futurice/schedule.svg?branch=master)](https://travis-ci.org/futurice/schedule)

# Create schedule templates and make Google Calendar Events from them

This file explains how to set up and run the project by hand.
See the `DEPLOY` file for a suggested way of doing this on a remote server.

For licensing (BSD 3-clause), see `COPYING`.

## Running locally on Docker

First install [Docker](https://www.docker.com/)
```
docker build --rm -t schedule .
```

```
docker run -d --restart always \
 -e POSTGRES_PASSWORD=secret \
 --name schedule-postgres postgres
```
```
docker exec -it schedule-postgres sh -c "createdb -Upostgres schedule"
```
```
docker run --rm -itp 8000:8000 \
 -e DB_HOST=schedule-postgres \
 -e DB_USER=postgres \
 -e DB_NAME=schedule \
 -e FUM_API_URL="" \
 -e FUM_API_TOKEN="" \
 --name schedule schedule
```
### Fetching users from FUM
```
docker exec schedule ./schedulesite/manage.py refresh_users
```

## Setup
```bash
# Create settings.py for Django:
cd schedulesite/schedulesite
cp settings_dev.py.template settings.py
# Set the SECRET_KEY in settings.py to some random string.
# Set CALENDAR_DOMAIN and TEST_CALENDAR_ID to the calendar to make events on.
cd -

npm install
PATH=./node_modules/.bin:$PATH bower install --config.interactive=false
```

Choose your Database by editing `settings.py`.
If you choose `PostgreSQL` then run `createdb futuschedule`.

Make a Python virtual environment however you prefer, then:
```bash
pip install -r req.txt
./schedulesite/manage.py migrate
```

You need a project in the Google Developers Console. Download its
`client-secrets.json` from there.

The first time the code needs Google OAuth, it looks for `client-secrets.json`
in your current directory, prints a URL for you to authorize the app and get
an access token in the URL fragment at the end.
Credentials are stored in `a_credentials_file` in your current dir.
Trigger this e.g. by running the unit tests (see below).

### Populate your DB with FUM users

Get a JSON dump of FUM users (you need an API token for FUM)
```bash
go run dump-fum-users.go -o users.json «AccessToken»
```

Create Django users from this dump:
```python
./schedulesite/manage.py shell
import futuschedule.util
futuschedule.util.updateUsers('users.json')
```

### Populate your DB with Meeting Rooms
```python
./schedulesite/manage.py shell
import futuschedule.util
futuschedule.util.updateMeetingRooms()
```


## Test
```bash
PATH=./node_modules/.bin:$PATH jsx --no-cache-dir schedulesite/futuschedule/static/futuschedule/js/src schedulesite/futuschedule/static/futuschedule/js/build
./schedulesite/manage.py test futuschedule
```


## Running

```bash
./schedulesite/manage.py migrate

# compile JSX files to plain JavaScript; JS files are copied unchanged
PATH=./node_modules/.bin:$PATH jsx --watch schedulesite/futuschedule/static/futuschedule/js/src schedulesite/futuschedule/static/futuschedule/js/build

# Start the webserver:
REMOTE_USER=myusername ./schedulesite/manage.py runserver

# Start the task-processor (kill with Ctrl+C (SIGINT) or SIGTERM):
./schedulesite/manage.py shell < task-processor.py
```

[http://localhost:8000/futuschedule/](http://localhost:8000/futuschedule/)
