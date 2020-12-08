[![Build Status](https://travis-ci.org/futurice/schedule.svg?branch=master)](https://travis-ci.org/futurice/schedule)

# Create schedule templates and make Google Calendar Events from them

This file explains how to set up and run the project by hand. 

For licensing (BSD 3-clause), see `COPYING`.

## Running locally on Docker 

Schedule runs in a [Docker](https://www.docker.com/) container, with database separated from the app. In local setting, it is easiest to run database also as a docker container. In production setting you might want to have the database in more stable environment. This guide is intended for running schedule locally.

### Font files, background pictures & client secrets

Before the build you have to add some files to the folder to include them in the docker image. For privacy reasons we cannot store them in the public Github repository.

Schedule can create pdf timetables of created schedules. Currently there is only one template, which is meant for introduction timetables for new employees. First create directory `pdf-generator/fonts`. Add two .otf font files there; bold.otf and font.otf. Then put the chosen background picture as pdf to `pdf-generator/intro_background.pdf`.

Then log in to google app console (https://console.developers.google.com/) with the google account you want to create the events in and create a new project for schedule. Once the project is created, give it rights to use the calendar API and download the client secrets file. Save it in the project root as `client_secrets.json`.

In conclusion, make sure that the following files are in the folder before building the docker image:

```
client_secrets.json
pdf-generator/fonts/font.otf
pdf-generator/fonts/bold.otf
pdf-generator/intro_background.pdf
```

## Build & run the docker containers

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
 -e DB_PASSWORD=secret \
 -e FUM_API_URL=example.com \
 -e FUM_API_TOKEN=x \
 -e TEST_CALENDAR_ID=test@example.com \
 -e CALENDAR_DOMAIN=example.com \
 -e DEBUG=true \
 -e FAKE_LOGIN=true \
 -e REMOTE_USER=me \
 -e SECRET_KEY=secret \
 --link schedule-postgres:schedule-postgres \
 -v $(pwd):/opt/app/:rw \
 --name schedule schedule
```

Note: To run tests add `-e TEST=true` to install additional browser support.

[localhost:8000](localhost:8000)

### Running Tasks
These tasks will be run automatically every hour, but they can be also run manually.

Fetching users from FUM:
```
docker exec schedule ./schedulesite/manage.py refresh_users
```
Updating meeting rooms:
```
docker exec schedule ./schedulesite/manage.py update_meeting_rooms
```

### Run tests

```
docker exec -e TRAVIS=true schedule xvfb-run ./schedulesite/manage.py test --failfast -v 3 futuschedule --settings=schedulesite.settings_test
```

## Authorizing the app
The app needs to be authorized with google before events can be created, edited or removed. To authorize the app you need `client_secrets.json` and authorize against the google account (TEST_CALENDAR_ID) that will keep log of the schedules. Authorization can be done using `python -c 'from futuschedule.create_credentials import run; run();'`.

The authorization link will be printed to the terminal. Copy that link to your browser and the app authorization page appears. Clicking accept leads to an error page but that is intended. Copy the code from the end of the url of that page and paste it to the terminal where you started the authorization.

This has to be done only once when the app is started for the first time. The credentials are stored in the database, so restarting the app doesn't require authorization if the database remains unchanged.

Deployment
----------

Install appswarm CLI from [appswarm](https://app.futurice.com), then build and deploy :

```bash
TAG=$(git rev-parse --short HEAD)
docker build --rm --tag futurice/schedule:$TAG .
appswarm image:push -i futurice/schedule -t $TAG
appswarm app:deploy -n schedule -i futurice/schedule -t $TAG
```
