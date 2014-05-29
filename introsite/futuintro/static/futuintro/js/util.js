/** @jsx React.DOM */

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
        successFieldName, errorFieldName) {
    return {
        componentDidMount: function() {
            compFetchRest.bind(this)(url, dataFieldName,
                    successFieldName, errorFieldName);
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
