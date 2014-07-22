/** @jsx React.DOM */

var apiRoot = '/futuschedule/api/';

function noop() {
}

/*
 * Create and return a React mixin which fetches data from url, getting all
 * .next pages. If successful, calls setState() with the .dataFieldName set to
 * the concatenated results and .successFieldName set to true.
 * If an error happens, calls setState() with .errorFieldName set to a
 * non-empty string.
 *
 * Use this with the Django REST Framework.
 *
 * The mixins work at ‘componentDidMount’ time, but don't provide a refresh()
 * method for you to call programmatically (and manually calling
 * componentDidMount() seems a bad idea).
 * To do manual refreshes, use compFetchRest() below.
 */
function getRestLoaderMixin(url, dataFieldName,
        successFieldName, errorFieldName, successCallback) {
    return {
        componentDidMount: function() {
            compFetchRest.bind(this)(url, dataFieldName,
                    successFieldName, errorFieldName, successCallback);
        }
    };
};


/*
 * Fetch data from Django REST Framework (and subsequent pages) and setState()
 * on the React Component. You must set ‘this’ to a React component when
 * running this function.
 * Similar to getRestLoaderMixin(), but you can call this repeatedly.
 * Could be better named.
 */
function compFetchRest(url, dataFieldName, successFieldName, errorFieldName,
        successCallback) {
    var data = [];
    function fetch() {
        if (!url) {
            var newState = {};
            newState[dataFieldName] = data;
            newState[successFieldName] = true;
            this.setState(newState, (successCallback || noop).bind(this));
            return;
        }

        $.ajax({
            url: url,
            success: (function(newData) {
                data = data.concat(newData.results);
                url = newData.next;
                fetch.bind(this)();
            }).bind(this),
            error: (function() {
                var newState = {};
                newState[errorFieldName] = getAjaxErr.apply(this, arguments);
                this.setState(newState);
            }).bind(this)
        });
    }
    fetch.bind(this)();
}


/*
 * Similar to compFetchRest() but fetches a single item not an array.
 *
 * This simple function is just mean to reduce boilerplate code in components
 * that make such an ajax call.
 */
function compFetchItemRest(url, dataFieldName, errorFieldName,
        successCallback) {
    $.ajax({
        url: url,
        success: (function(data) {
            var newState = {};
            newState[dataFieldName] = data;
            this.setState(newState, (successCallback || noop).bind(this));
        }).bind(this),
        error: (function() {
            var newState = {};
            newState[errorFieldName] = getAjaxErr.apply(this, arguments);
            this.setState(newState);
        }).bind(this)
    });
}


/*
 * Recursively clone a plain JS object, array, number, boolean or string.
 */
function clone(obj) {
    if (Array.isArray(obj)) {
        return obj.map(function(x) {
            return clone(x);
        });
    }

    if (obj === null || obj === undefined) {
        return obj;
    }

    switch (typeof(obj)) {
        case 'number':
        case 'string':
        case 'boolean':
            return obj;
        default:
            var result = {};
            for (var k in obj) {
                result[k] = clone(obj[k]);
            }
            return result;
    }
}


/*
 * Recursively compare plain JS objects, arrays, numbers, booleans or strings.
 *
 * Keep this similar to clone().
 */
function sameModels(a, b) {
    // this ‘===’ test is meant as a shortcut way out
    if (a === b) {
        return true;
    }

    var result = true, i;

    if (Array.isArray(a)) {
        if (!Array.isArray(b)) {
            return false;
        }
        if (a.length != b.length) {
            return false;
        }

        for (i = 0; i < a.length; i++) {
            result = result && sameModels(a[i], b[i]);
        }
        return result;
    }

    if (typeof(a) != typeof(b)) {
        return false;
    }

    if (a === null || b === null) {
        return a === b;
    }

    switch (typeof(a)) {
        case 'undefined':
        case 'number':
        case 'string':
        case 'boolean':
            return a === b;

        default:
            var aKeys = Object.keys(a).sort(), bKeys = Object.keys(b).sort();
            if (!sameModels(aKeys, bKeys)) {
                return false;
            }
            for (i = 0; i < aKeys.length; i++) {
                result = result && sameModels(a[aKeys[i]], b[bKeys[i]]);
            }
            return result;
    }
}

/*
 * Return a string describing the error, from the args of jQuery's ajax.error
 * function.
 */
function getAjaxErr(xhr, txtStatus, errThrown) {
    console.log('error', xhr, txtStatus, errThrown);
    var errTxt = 'Error';
    if (xhr.responseText) {
        try {
            // JSON response is an explanation of the problem.
            // Anything else is probably a huge html page
            // describing server misconfiguration.
            errTxt += ': ' + JSON.stringify(JSON.parse(xhr.responseText));
        } catch (exc) {
            // json parsing error
        }
    }
    return errTxt;
}

/*
 * A React mixin helping with a few data model conventions.
 *
 * The model=… property is either a plain JS object (your model) or null,
 * indicating your component must show a form for creating a new item.
 *
 * blankModel must be a plain JS object to use as a blank model.
 */
function getPropModelClonerMixin(blankModel) {
    return {
        isNewItem: function() {
            return this.props.model == null;
        },

        // Get a copy of the initial read-only model, e.g. to use as a
        // mutable model for editing.
        copyInitialModel: function() {
            if (this.isNewItem()) {
                return clone(blankModel);
            } else {
                return clone(this.props.model);
            }
        }
    };
};


/*
 * Drop seconds from time string.
 *
 * 11:00:00 → 11:00, 08:00:00 → 08:00
 * Leave the leading ‘0’ because <input type="time"> wants it.
 */
function dropSeconds(s) {
    var re = /\d\d\:\d\d\:\d\d/;
    if (s.match(re)) {
        s = s.slice(0, -3);
    }
    return s;
}


/*
 * Get the value from the event's target, with special cases for "null" etc.
 */
function getTargetValue(event) {
    var target = event.target, val = target.value;
    switch (target.tagName) {
        case "SELECT":
            // React treats <… someAttr={null|true|false|option} …>
            // specially. So working around that.
            if (val == 'null') {
                val = null;
            } else if (val == 'true') {
                val = true;
            } else if (val == 'false') {
                val = false;
            }
            break;
        case "INPUT":
            if (target.type == 'checkbox') {
                val = target.checked;
            }
            break;
    }
    return val;
}


var MultiSelect = React.createClass({
    propTypes: {
        // for O(1) lookup: {id1: string-representation, id2: string-2, …}
        itemTextById: React.PropTypes.object.isRequired,
        // specifies the display order (e.g. alphabetical by string-repr)
        sortedIds: React.PropTypes.array.isRequired,
        // if the size is small, an array is ok and keeps the order
        selectedIds: React.PropTypes.array.isRequired,
        // onRemove(id)
        onRemove: React.PropTypes.func.isRequired,
        // onAdd(id)
        onAdd: React.PropTypes.func.isRequired,
        disabled: React.PropTypes.bool.isRequired
    },
    getInitialState: function() {
        var searchText = '';
        return {
            searchText: searchText,
            showSuggestions: false,
            suggestedIds: this.getSuggestions(searchText),
            // null if no suggestions, a valid index otherwise
            selectedSuggestionIdx: null,

            // MouseDown on suggestions list: used in handleInputBlur()
            suggestionsMouseDown: false
        };
    },
    getSuggestions: function(searchText) {
        searchText = searchText.toLowerCase();
        return this.props.sortedIds.filter((function(id) {
            var itemTxt = this.props.itemTextById[id].toLowerCase();
            return itemTxt.indexOf(searchText) != -1;
        }).bind(this));
    },
    handleSearchTextChange: function(ev) {
        var txt = getTargetValue(ev),
            ids = this.getSuggestions(txt);
        this.setState({
            searchText: txt,
            showSuggestions: true,
            suggestedIds: ids,
            selectedSuggestionIdx: ids.length ? 0 : null
        });
    },
    handleInputKeyDown: function(ev) {
        if (ev.keyCode == 27) {
            // ESC key
            this.setState({
                showSuggestions: false
            });
            return;
        }
        var i = this.state.selectedSuggestionIdx,
            v = this.state.suggestedIds;
        if (!v.length) {
            return;
        }
        switch (ev.keyCode) {
            case 38:    // UP Arrow
                i--;
                if (i < 0) {
                    i = v.length - 1;
                }
                this.setState({
                    selectedSuggestionIdx: i,
                    showSuggestions: true
                });
                break;

            case 40:    // DOWN Arrow
                i++;
                if (i >= v.length) {
                    i = 0;
                }
                this.setState({
                    selectedSuggestionIdx: i,
                    showSuggestions: true
                });
                break;

            case 13:
                // Enter key
                if (this.state.showSuggestions) {
                    this.props.onAdd(v[i]);
                } else {
                    this.setState({
                        showSuggestions: true
                    });
                }
                break;
            default:
                return;
        }
        ev.preventDefault();
    },
    handleInputFocus: function() {
        this.setState({
            showSuggestions: true
        });
    },
    handleInputBlur: function() {
        // Hide the suggestion list on blur. Except if the user tries to click
        // on the suggestion list, this blur fires first and hides the list.
        // Workaround: record mouseUp/mouseDown events in the suggestion list.
        // Put a small delay here to allow that click to happen, before
        // deciding to hide the suggestion list.

        // This workaround is taken from the jquery-marcopolo plugin:
        // https://github.com/jstayton/jquery-marcopolo
        setTimeout((function() {
            if (!this.state.suggestionsMouseDown) {
                this.setState({
                    showSuggestions: false
                });
            }
        }).bind(this), 1);
    },
    handleSuggestionClick: function(id) {
        this.props.onAdd(id);
        this.refs.searchbox.getDOMNode().focus();
    },
    handleSuggestionMouseEnter: function(idx) {
        this.setState({
            selectedSuggestionIdx: idx
        });
    },
    handleSuggestionListMouseDown: function() {
        // used in handleInputBlur()
        this.setState({
            suggestionsMouseDown: true
        });
    },
    handleSuggestionListMouseUp: function() {
        // used in handleInputBlur()
        this.setState({
            suggestionsMouseDown: false
        });
    },
    handleRemove: function(id, ev) {
        ev.preventDefault();
        this.props.onRemove(id);
    },
    render: function() {
        var suggestionElems = <li>No matches</li>;
        if (this.state.suggestedIds.length) {
            suggestionElems = this.state.suggestedIds.map((function(id, idx) {
                return <li key={id}
                    onClick={this.handleSuggestionClick.bind(this, id)}
                    onMouseEnter={this.handleSuggestionMouseEnter.bind(this, idx)}
                    // avoid the experimental React.addons.classSet() for now.
                    className={this.state.selectedSuggestionIdx == idx ?
                        'match selected' : 'match'}
                    >
                    {this.props.itemTextById[id]}
                </li>;
            }).bind(this));
        }

        var suggestionBox;
        if (this.state.showSuggestions) {
            suggestionBox = <div
                className="typeahead-suggestions-parent"
                hidden={this.props.disabled}
                >
                <ul className="typeahead-suggestions"
                    onMouseDown={this.handleSuggestionListMouseDown}
                    onMouseUp={this.handleSuggestionListMouseUp}
                    >
                    {suggestionElems}
                </ul>
            </div>;
        }

        return <div>
            {this.props.selectedIds.length ? '' :
                <span className="info">No item selected</span>}
            <ul>
                {this.props.selectedIds.map((function(id) {
                    return <li key={id}>
                        {this.props.itemTextById[id]}
                        <a href=""
                            onClick={this.handleRemove.bind(this, id)}
                            hidden={this.props.disabled}
                            >×</a>
                    </li>;
                }).bind(this))}
            </ul>

            <input ref="searchbox" type="text" placeholder="Type to search…"
                disabled={this.props.disabled}
                value={this.state.searchText}
                onChange={this.handleSearchTextChange}
                onKeyDown={this.handleInputKeyDown}
                onFocus={this.handleInputFocus}
                onBlur={this.handleInputBlur}
            />
            {suggestionBox}
        </div>;
    }
});


/*
 * Helper to create the props required by MultiSelect.
 *
 * @param {object[]} items - array of your custom models
 * @param getId - func(model) → id
 * @param getText - func(mdel) → string
 * @param compareFunc - func(model1, model1) → -1, 0 or 1
 * @returns {object}
 */
function makeMultiSelectModel(items, getId, getText, compareFunc) {
    var result = {
        itemTextById: {},
        sortedIds: null
    };
    items.forEach(function(x) {
        result.itemTextById[getId(x)] = getText(x);
    });

    var sortedItems = items.concat();
    sortedItems.sort(compareFunc);
    result.sortedIds = sortedItems.map(getId);

    return result;
}

function makeRoomMultiSelectModel(roomObjects) {
        return makeMultiSelectModel(roomObjects,
                getRoomId, getRoomName, compareRoomNames);

        function getRoomId(r) {
            return r.id;
        }

        function getRoomName(r) {
            return r.name;
        }

        function compareRoomNames(r1, r2) {
            r1 = getRoomName(r1).toLowerCase();
            r2 = getRoomName(r2).toLowerCase();
            if (r1 == r2) {
                return 0;
            }
            return (r1 < r2) ? -1 : 1;
        }
}

/*
 * A component that displays a prefix of the text and lets you click it to
 * see the full text.
 */
var PreviewExpandBox = React.createClass({
    propTypes: {
        text: React.PropTypes.string.isRequired,
        previewLength: React.PropTypes.number
    },
    getDefaultProps: function() {
        return {
            previewLength: 60
        }
    },
    getInitialState: function() {
        return {
            expanded: false
        };
    },
    toggle: function() {
        this.setState({
            expanded: !this.state.expanded
        });
    },
    render: function() {
        var txt = this.props.text;
        if (!this.state.expanded &&
                this.props.text.length > this.props.previewLength) {
            txt = this.props.text.substring(0, this.props.previewLength) + '…';
        }
        return <div className="preview-expand-box" onClick={this.toggle}>
            {txt}
        </div>;
    }
});


/*
 * ['John', 'Pete', 'Paul'] → 'John, Pete and Paul'
 */
function enumSentence(items) {
    switch (items.length) {
        case 0:
            return '';
        case 1:
            return items[0];
        default:
            return items.slice(0, -1).join(', ') +
                ' and ' + items[items.length-1];
    }
}

function getUserName(userId, usersById) {
    var user = usersById[userId];
    if (user) {
        return user.first_name + ' ' + user.last_name;
    } else {
        return 'Unknown User';
    }
}

function getUserNameAndEmail(userId, usersById) {
    var user = usersById[userId];
    if (user) {
        return user.first_name + ' ' + user.last_name + ' (' +
                user.email + ')';
    } else {
        return 'Unknown User';
    }
}
