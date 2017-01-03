from models import SchedulingRequest, Event
import json
import dateutil.parser
import os

#returns latex block of the text with given color
def colorize(text, colorName):
    return '{\color{'+colorName+"}"+text+"}"

#bolded latex text
def bold(text):
    return '\\textbf{'+text+"}"

def formatEvents(schedule):
    events = []
    for event in Event.objects.filter(schedules=schedule):
        eventJson = json.loads(event.json)
        newEvent = {
            'name' : event.template.summary,
            'dateTime' : dateutil.parser.parse(eventJson['start']['dateTime'])
        }
        if eventJson.has_key('location'):
            newEvent['location'] = eventJson['location']
        else:
            newEvent['location'] = ''
        events += [newEvent]
    return events

def formatTime(date):
    return date.strftime('%H:%M')

def formatDate(date):
    return colorize(bold(date.strftime('%A %d.%m.%Y').upper()), 'futugreen')

def formatEvent(event):
    return formatTime(event['dateTime']) + " " +handleSpecialCharacters(event['name']) +" "+ colorize(handleSpecialCharacters(event['location']), 'futugreen')
    
def generateEventsText(schedule):
    events = formatEvents(schedule)
    events.sort(key=lambda event: event['dateTime'])
    output = ""
    daysPassed = 0
    lastDate = None
    for event in events:
        if(lastDate == None or formatDate(event['dateTime']) != lastDate):
            daysPassed += 1
            if daysPassed > 3:
                break
            if daysPassed != 1:
                output += '\\vspace{5mm}'
            output += formatDate(event['dateTime'])
            output += '\n\n'
        output += formatEvent(event) + '\n\n'
        lastDate = formatDate(event['dateTime'])
    return output

def handleSpecialCharacters(text):
    specials = ["&", "#", "$", "%", "^", "_", "{", "}", "~", "+"]
    for s in specials:
        text = text.replace(s, '\\'+s)
    return text


def generatePdf(schedule, directory, filename, templateFile, backgroundFile):
    templateFile = open(templateFile)
    text = templateFile.read()
    text += generateEventsText(schedule)
    text += '\end{document}\n'
    texFileName = directory+filename+"_temp.tex"
    newFile = open(texFileName, 'w')
    newFile.write(text)
    newFile.close()
    os.system("lualatex --output-directory="+directory+" " + texFileName)
    os.system("pdftk "+backgroundFile+" stamp "+directory+filename+"_temp.pdf output "+directory+filename+".pdf")
