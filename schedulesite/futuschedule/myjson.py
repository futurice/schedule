# http://stackoverflow.com/questions/21631878/celery-is-there-a-way-to-write-custom-json-encoder-decoder
import json
import uuid
from datetime import datetime, date
from time import mktime
from django.db.models.fields.files import FieldFile

class MyEncoder(json.JSONEncoder):   
    def default(self, obj):
        if isinstance(obj, datetime):
            return {'__type__': '__datetime__', 'epoch': int(mktime(obj.timetuple())),}
        elif isinstance(obj, date):
            return {'__type__': '__date__', 'epoch': int(mktime(obj.timetuple())),}
        elif isinstance(obj, uuid.UUID):
            return {'__type__': '__uuid__', 'tval': str(obj), 'tversion': obj.version,}
        elif isinstance(obj, FieldFile):
            # too complex, has nested model instance; passing on filename only
            return {'__type__': '__fieldfile__', 'tval': getattr(obj, 'name', None)}
        else:
            return json.JSONEncoder.default(self, obj)

def my_decoder(obj):
    if '__type__' in obj:
        if obj['__type__'] == '__datetime__':
            return datetime.fromtimestamp(obj['epoch'])
        if obj['__type__'] == '__date__':
            return date.fromtimestamp(obj['epoch'])
        if obj['__type__'] == '__uuid__':
            return uuid.UUID('{%s}'%obj['tval'], version=obj['tversion'])
        if obj['__type__'] == '__fieldfile__':
            ff = FieldFile(None, type('field', (object,), {'storage':{}}), None)
            ff.name = obj['tval']
            return ff
    return obj

def my_dumps(obj):
    return json.dumps(obj, cls=MyEncoder)

def my_loads(obj):
    return json.loads(obj, object_hook=my_decoder)