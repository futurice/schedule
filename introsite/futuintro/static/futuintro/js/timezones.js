/** @jsx React.DOM */

/*
 * Fetches the timezones when created then displays them.
 */
var TimeZoneListComp = React.createClass({
    mixins: [
        getRestLoaderMixin('/futuintro/api/timezones/', 'timezones',
            'tzLoaded', 'tzErr'),
    ],
    getInitialState: function() {
        return {
            timezones: [],
            tzLoaded: false,
            tzErr: ''
        };
    },
    onDelete: function(deletedTz) {
        // non-optimal O(n) operation
        var timezones = this.state.timezones.filter(function(tz) {
            return tz.id != deletedTz.id;
        });
        this.setState({
            timezones: timezones
        });
    },
    onCreate: function(obj) {
        this.setState({
            timezones: this.state.timezones.concat(obj)
        });
    },
    onUpdate: function(obj) {
        this.setState({
            timezones: this.state.timezones.map(function(tz) {
                if (tz.id == obj.id) {
                    return obj;
                }
                return tz;
            })
        });
    },
    render: function() {
        if (this.state.tzErr) {
            return <div>
                <span className="status-error">{this.state.tzErr}</span>
            </div>;
        }
        if (!this.state.tzLoaded) {
            return <div>
                <span className="status-waiting">Getting data…</span>
            </div>;
        }

        // tz is either an object or null (for the "add new" form).
        function createTimezoneComp(tz) {
            return <li key={tz ? tz.id : 'add-new-tz-item'}>
                    <TimeZoneComp
                        model={tz}
                        onDelete={this.onDelete}
                        onCreate={this.onCreate}
                        onUpdate={this.onUpdate}
                    />
                </li>;
        }
        return <div>
            {this.state.timezones.length ? '' :
                <span className="info">
                    You have not entered any timezones.
                </span>}
            <ul id="timezone-list">
                {this.state.timezones.map(createTimezoneComp, this)}
                {createTimezoneComp.bind(this)(null)}
            </ul>
        </div>;
    }
});

/*
 * Display, edit and delete a TimeZone, or create a new one.
 *
 * model is either a timezone object {…} or null, which means show a form to
 * create a new timezone.
 */
var TimeZoneComp = React.createClass({
    mixins: [
        getPropModelClonerMixin({
            id: null,
            name: ''
        }),
    ],
    propTypes: {
        model: React.PropTypes.object,
        onDelete: React.PropTypes.func.isRequired,
        onCreate: React.PropTypes.func.isRequired
    },
    getInitialState: function() {
        var state = {
            // If non-empty, an AJAX request is in flight and this is its
            // description, e.g. ‘Saving…’.
            reqInFlight: '',
            // If non-empty, the previous request had an error and this is a
            // text to show the user.
            reqErr: '',

            editing: this.isNewItem(),
            // the existing item has been deleted
            deleted: false
        };

        if (state.editing) {
            // this is a mutable model, used only in edit mode
            state.editModel = this.copyInitialModel();
        }

        return state;
    },
    edit: function() {
        this.setState({
            editing: true,
            // reset the editModel every time we enter edit mode
            editModel: this.copyInitialModel(),
            reqErr: '',
        });
    },
    cancelEdit: function() {
        this.setState({
            editing: false,
            reqErr: ''
        });
    },
    handleChange: function(modelFieldName, event) {
        var m = clone(this.state.editModel);
        m[modelFieldName] = event.target.value;
        this.setState({
            editModel: m
        });
    },
    saveOrCreate: function(evt) {
        evt.preventDefault();
        this.setState({
            reqInFlight: this.isNewItem() ? 'Creating…' : 'Saving…'
        });

        var url;
        if (this.isNewItem()) {
            url = '/futuintro/api/timezones/';
        } else {
            url = '/futuintro/api/timezones/' + this.props.model.id + '/';
        }

        $.ajax({
            url: url,
            type: this.isNewItem() ? 'POST' : 'PUT',
            contentType: 'application/json; charset=UTF-8',
            headers: {
                'X-CSRFToken': $.cookie('csrftoken')
            },
            data: JSON.stringify(this.state.editModel),
            complete: (function(data) {
                this.isMounted() && this.setState({
                    reqInFlight: ''
                });
            }).bind(this),
            success: (function(data) {
                if (this.isNewItem()) {
                    this.props.onCreate(data);
                    this.setState(this.getInitialState());
                    return;
                }
                this.props.onUpdate(data);
                this.setState({
                    reqErr: '',
                    editing: false
                });
            }).bind(this),
            error: (function(xhr, txtStatus, saveErr) {
                this.setState({reqErr: getAjaxErr.apply(this, arguments)});
            }).bind(this)
        });
    },
    delete: function() {
        this.setState({
            reqInFlight: 'Deleting…'
        });

        $.ajax({
            url: '/futuintro/api/timezones/' + this.props.model.id + '/',
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
                this.props.onDelete(this.props.model);
                // Game-over. We don't care about any other state fields.
                this.isMounted() && this.setState({
                    deleted: true,
                });
            }).bind(this),
            error: (function(xhr, txtStatus, delErr) {
                this.setState({reqErr: getAjaxErr.apply(this, arguments)});
            }).bind(this)
        });
    },

    render: function() {
        var statusBox;

        if (this.state.deleted) {
            return <div>Deleted.</div>;
        }

        if (this.state.reqInFlight || this.state.reqErr) {
            statusBox = <span
                    className={'status-' +
                        (this.state.reqInFlight ? 'waiting' : 'error')}>
                    {this.state.reqInFlight ?
                        this.state.reqInFlight : this.state.reqErr }
                </span>;
        }

        if (!this.state.editing) {
            return <div>
                    {this.props.model.name}
                    <button type="button"
                        onClick={this.edit}
                        disabled={this.state.reqInFlight}>Edit</button>
                    <button type="button"
                        onClick={this.delete}
                        disabled={this.state.reqInFlight}>Delete</button>
                    {statusBox}
                </div>;
        }

        return <form onSubmit={this.saveOrCreate}>
                <input type="text"
                    placeholder="Time zone name…"
                    value={this.state.editModel.name}
                    onChange={this.handleChange.bind(this, 'name')}
                    disabled={this.state.reqInFlight} />
                <button type="button"
                    onClick={this.cancelEdit}
                    disabled={this.state.reqInFlight}
                    hidden={this.isNewItem()}>Cancel</button>
                <button type="submit"
                    disabled={this.state.reqInFlight}>
                    {this.isNewItem() ? 'Add new' : 'Save'}
                </button>

                {this.isNewItem() ? <br/> : ''}
                {statusBox}
            </form>;
    }
});
