import datetime
from fabric.api import task, env
from fabric.context_managers import cd, prefix, settings, shell_env
from fabric.operations import sudo
import os, os.path
import random
import string


env.hosts = env.hosts or ['artunium.futurice.com']
schedule_user = 'futuschedule'
home_dir = '/home/futuschedule'

stamp = datetime.datetime.utcnow().isoformat().replace(':', '').replace('-', '')
stamp = stamp[:stamp.rfind('.')] + 'Z'
config_dir = os.path.join(home_dir, 'config-files')
repo_link = os.path.join(home_dir, 'futuschedule')
env_link = os.path.join(home_dir, 'venv')
repo_dir = os.path.join(home_dir, 'futuschedule-' + stamp)
env_dir = os.path.join(home_dir, 'venv-' + stamp)
manage_py = os.path.join(repo_dir, 'schedulesite', 'manage.py')

git_clone_url = 'https://github.com/futurice/schedule.git'


@task
def stop_services():
    sudo('supervisorctl stop task-processor')
    sudo('service apache2 stop')


@task
def start_services():
    sudo('supervisorctl start task-processor')
    sudo('service apache2 start')


def clone_repository():
    with settings(sudo_user=schedule_user):
        sudo('git clone ' + git_clone_url + ' ' + repo_dir)


def make_env():
    with settings(sudo_user=schedule_user):
        sudo('virtualenv ' + env_dir)
        with prefix('source ' + os.path.join(env_dir, 'bin/activate')):
            sudo('pip install -r ' + os.path.join(repo_dir, 'req.txt'))


def prepare_repository():
    with settings(sudo_user=schedule_user):
        settings_dir = os.path.join(repo_dir, 'schedulesite', 'schedulesite')
        with settings(cd(settings_dir)):
            sudo('cp settings_prod.py.template settings.py')
            chars = string.ascii_letters + string.digits
            secret_key = ''.join(random.choice(chars) for x in range(40))
            sudo('echo \'SECRET_KEY = "' + secret_key + '"\' >>settings.py')

        with settings(cd(repo_dir)):
            # otherwise bower tries to access ~/.config for the SSH user
            with shell_env(HOME=home_dir):
                # disable the 'may bower report statistics?' question
                sudo('bower install --config.interactive=false')

                sudo('npm install react-tools')
            js_dir = os.path.join(repo_dir, 'schedulesite', 'futuschedule',
                    'static', 'futuschedule', 'js')
            sudo('./node_modules/.bin/jsx --no-cache-dir {} {}'.format(
                os.path.join(js_dir, 'src'), os.path.join(js_dir, 'build')))


def run_tests():
    with settings(cd(config_dir), sudo_user=schedule_user):
        with prefix('source ' + os.path.join(env_dir, 'bin/activate')):
            sudo(manage_py + ' test futuschedule')


def migrate():
    with settings(sudo_user=schedule_user):
        with prefix('source ' + os.path.join(env_dir, 'bin/activate')):
            sudo(manage_py + ' migrate')


def move_symlinks():
    with settings(sudo_user=schedule_user):
        sudo('rm -f ' + env_link + ' ' + repo_link)
        sudo('ln -s ' + env_dir + ' ' + env_link)
        sudo('ln -s ' + repo_dir + ' ' + repo_link)


@task
def deploy():
    stop_services()
    clone_repository()
    make_env()
    prepare_repository()
    run_tests()
    migrate()
    move_symlinks()
    start_services()

    print('Completed deploy with timestamp {}'.format(stamp))
