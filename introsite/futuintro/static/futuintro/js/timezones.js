/** @jsx React.DOM */

/*
 * Fetches the data when initially created. Could be better named.
 */
var FetchingTimeZoneList = React.createClass({
    getInitialState: function() {
        return {
            doneFetching: false,
            hasErr: false,
            items: [],
            // whether a new item to create is shown at the end
            newBlankItem: false
        };
    },
    fetchData: function() {
        var self = this, items = [], nextUrl = '/futuintro/api/timezones/';
        function fetch() {
            if (nextUrl) {
                $.ajax({
                    url: nextUrl,
                    success: (function(data) {
                        items = items.concat(data.results);
                        nextUrl = data.next;
                        self.timerId = setTimeout(fetch, 0);
                    }),
                    error: function(req, txtStatus, txtErr) {
                        console.error('Failed:', req, txtStatus, txtErr);
                        self.setState({
                            doneFetching: true,
                            hasErr: true
                        });
                    }
                });
            } else {
                self.setState({
                    doneFetching: true,
                    items: items
                });
            }
        }

        // so we can cancel the timer if the component is unmounted
        // while we're still processing requests.
        this.timerId = setTimeout(fetch, 0);
    },
    componentDidMount: function() {
        this.fetchData();
    },
    componentWillUnmount: function() {
        clearTimeout(this.timerId);
    },
    onDelete: function(deletedItem) {
        // non-optimal O(n) operation
        var itemsLeft = this.state.items.filter(function(item) {
            return item.id != deletedItem.id;
        });
        this.setState({
            items: itemsLeft
        });
    },
    onNewItemCreated: function() {
        this.setState(this.getInitialState());
        this.fetchData();
    },
    toggleNewItem: function() {
        var newItems;
        if (this.state.newBlankItem) {
            newItems = this.state.items.slice(0, -1);
        } else {
            // convention (also for bottom-level view&edit component):
            // null ID and no other fields means create.
            newItems = this.state.items.concat({id: null});
        }
        this.setState({
            newBlankItem: !this.state.newBlankItem,
            items: newItems
        });
    },
    render: function() {
        if (!this.state.doneFetching) {
            return <div>Getting data…</div>;
        }
        if (this.state.hasErr) {
            return <div>There was an error getting data</div>;
        }
        return <div>
                <TimeZoneListComp
                    timezones={this.state.items}
                    onDelete={this.onDelete}
                    onNewItemCreated={this.onNewItemCreated}
                    onNewItemCanceled={this.toggleNewItem}
                />
                <button type="button"
                    onClick={this.toggleNewItem}
                    hidden={this.state.newBlankItem}>+ Add another</button>
            </div>
    }
});

/*
 * Requires you to pass the data in an attribute.
 */
var TimeZoneListComp = React.createClass({
    propTypes: {
        timezones: React.PropTypes.array.isRequired,
        onDelete: React.PropTypes.func,
        onNewItemCreated: React.PropTypes.func,
        onNewItemCanceled: React.PropTypes.func
    },
    getDefaultProps: function() {
        return {
            timezones: [],
            onDelete: function() {},
            onNewItemCreated: function() {},
            onNewItemCanceled: function() {}
        };
    },
    render: function() {
        function createTimezoneComp(tz) {
            // support the null id
            return <li key={'' + tz.id}>
                    <TimeZoneComp
                        tz={tz}
                        onDelete={this.props.onDelete}
                        onNewItemCreated={this.props.onNewItemCreated}
                        onNewItemCanceled={this.props.onNewItemCanceled}
                    />
                </li>;
        }
        return <ul>{this.props.timezones.map(createTimezoneComp, this)}</ul>;
    }
});

/*
 * Display, edit and delete a TimeZone.
 *
 * After deleting, onDelete({id: the_id}) is called.
 */
var TimeZoneComp = React.createClass({
    propTypes: {
        tz: React.PropTypes.object.isRequired,
        onDelete: React.PropTypes.func,
        onNewItemCreated: React.PropTypes.func,
        onNewItemCanceled: React.PropTypes.func
    },
    getDefaultProps: function() {
        return {
            onDelete: function() {},
            onNewItemCreated: function() {},
            onNewItemCanceled: function() {}
        };
    },
    getId: function() {
        return this.props.tz.id;
    },
    // we're editing a new item that's to be created
    isNewItem: function() {
        return this.getId() == null;
    },
    getInitialState: function() {
        return {
            name: this.props.tz.name,

            // If non-empty, an AJAX request is in flight and this is its
            // description, e.g. ‘Saving…’.
            reqInFlight: '',
            // If non-empty, the previous request had an error and this is a
            // text to show the user.
            reqErr: '',

            editing: this.isNewItem(),
            deleted: false
        };
    },
    edit: function() {
        this.setState({
            editing: true,
            newName: this.state.name,
            reqErr: '',
        });
    },
    handleChange: function(event) {
        this.setState({
            newName: event.target.value
        });
    },
    cancelEdit: function() {
        if (this.isNewItem()) {
            // Game-over
            this.props.onNewItemCanceled();
            this.setState({
                newItemCanceled: true
            });
            return;
        }

        this.setState({
            editing: false,
            reqErr: ''
        });
    },
    save: function(evt) {
        evt.preventDefault();
        this.setState({
            reqInFlight: this.isNewItem() ? 'Creating…' : 'Saving…'
        });

        var url;
        if (this.isNewItem()) {
            url = '/futuintro/api/timezones/';
        } else {
            url = '/futuintro/api/timezones/' + this.getId() + '/';
        }

        // TODO: remove the setTimeout (tests delays in DEV).
        setTimeout((function() {
        $.ajax({
            url: url,
            type: this.isNewItem() ? 'POST' : 'PUT',
            contentType: 'application/json; charset=UTF-8',
            headers: {
                'X-CSRFToken': $.cookie('csrftoken')
            },
            data: JSON.stringify({
                name: this.state.newName
            }),
            complete: (function(data) {
                this.isMounted() && this.setState({
                    reqInFlight: ''
                });
            }).bind(this),
            success: (function(data) {
                if (this.isNewItem()) {
                    // Game-over. Parent must handle from here.
                    this.setState({
                        newItemCreated: true
                    });
                    this.props.onNewItemCreated();
                    return;
                }
                this.setState({
                    name: this.state.newName,
                    reqErr: '',
                    editing: false
                });
            }).bind(this),
            error: (function(xhr, txtStatus, saveErr) {
                console.log('error', xhr, txtStatus, saveErr);
                var errTxt = 'Error';
                if (xhr.responseText) {
                    try {
                        // JSON response is an explanation of the problem.
                        // Anything else is probably a huge html page
                        // describing server misconfiguration.
                        errTxt += ': ' + JSON.stringify(
                            JSON.parse(xhr.responseText));
                    } catch (exc) {
                        // json parsing
                    }
                }

                this.setState({
                    reqErr: errTxt
                });
            }).bind(this)
        });
        }).bind(this), 3000);
    },
    delete: function() {
        this.setState({
            reqInFlight: 'Deleting…'
        });

        // TODO: remove the setTimeout (tests delays in DEV).
        setTimeout((function() {
        $.ajax({
            url: '/futuintro/api/timezones/' + this.getId() + '/',
            type: 'DELETE',
            headers: {
                'X-CSRFToken': $.cookie('csrftoken')
            },
            complete: (function(data) {
                this.isMounted() && this.setState({
                    reqInFlight: ''
                });
            }).bind(this),
            success: (function(data) {
                // Game-over. We don't care about any other state fields.
                this.setState({
                    deleted: true,
                    reqErr: ''
                });
                this.props.onDelete({
                    id: this.getId()
                });
            }).bind(this),
            error: (function(xhr, txtStatus, delErr) {
                console.log('error', xhr, txtStatus, delErr);
                var errTxt = 'Error';
                if (xhr.responseText) {
                    try {
                        errTxt += ': ' + JSON.stringify(
                            JSON.parse(xhr.responseText));
                    } catch (exc) {
                        // json parsing
                    }
                }

                this.setState({
                    reqErr: errTxt
                });
            }).bind(this)
        });
        }).bind(this), 3000);
    },
    render: function() {
        var statusBox;

        if (this.state.deleted) {
            return <div>This TimeZone has been deleted.
                You should not be seeing this.</div>;
        }

        if (this.state.newItemCanceled) {
            return <div>Creating new TimeZone canceled.
                You should not be seeing this.</div>;
        }
        if (this.state.newItemCreated) {
            return <div>New TimeZone created.
                You should not be seeing this.</div>;
        }

        if (this.state.reqInFlight || this.state.reqErr) {
            statusBox = <span
                    className={'status-' + (this.state.reqInFlight ? 'info' : 'error')}>
                    {this.state.reqInFlight ? this.state.reqInFlight : this.state.reqErr }
                </span>;
        }

        if (!this.state.editing) {
            return <div>
                    {this.state.name}
                    <button type="button"
                        onClick={this.edit}
                        disabled={this.state.reqInFlight}>Edit</button>
                    <button type="button"
                        onClick={this.delete}
                        disabled={this.state.reqInFlight}>Delete</button>
                    {statusBox}
                </div>;
        }

        return <form onSubmit={this.save}>
                <input type="text"
                    value={this.state.newName}
                    onChange={this.handleChange}
                    disabled={this.state.reqInFlight} />
                <button type="button"
                    onClick={this.cancelEdit}
                    disabled={this.state.reqInFlight}>Cancel</button>
                <button type="submit"
                    disabled={this.state.reqInFlight}>Save</button>
                {statusBox}
            </form>;
    }
});
