from fabric.api import task, env
from fabric.context_managers import cd, prefix, settings
from fabric.operations import sudo

env.hosts = env.hosts or ['artunium.futurice.com']
code_dir = '/home/futuschedule/futuschedule'
code_dir_user = 'futuschedule'
venv_dir = '/home/futuschedule/venv'

@task
def stop_services():
    sudo('supervisorctl stop task-processor')
    sudo('service apache2 stop')

@task
def start_services():
    sudo('supervisorctl start task-processor')
    sudo('service apache2 start')

def updateCode():
    with settings(cd(code_dir), sudo_user=code_dir_user):
        sudo('git pull')
        with prefix('source ' + venv_dir + '/bin/activate'):
            sudo('pip install -r req.txt')
            sudo('./schedulesite/manage.py migrate')

@task
def deploy():
    stop_services()
    updateCode()
    start_services()
