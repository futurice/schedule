import logging
logging.basicConfig(level=logging.INFO)

from futuschedule.tasksched import loop
loop()
