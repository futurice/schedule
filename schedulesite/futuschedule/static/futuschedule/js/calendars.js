/** @jsx React.DOM */

var CalendarList = React.createClass({
    mixins: [
        getRestLoaderMixin(apiRoot + 'calendars/?ordering=email',
            'calendars', 'calLoaded', 'calErr'),
    ],
    getInitialState: function() {
        return {
            calendars: [],
            calLoaded: false,
            calErr: ''
        };
    },
    onDelete: function(deletedCal) {
        this.setState({
            calendars: this.state.calendars.filter(function(cal) {
                return cal.id != deletedCal.id;
            })
        });
    },
    onCreate: function(obj) {
        this.setState({
            calendars: this.state.calendars.concat(obj)
        });
    },
    onUpdate: function(obj) {
        this.setState({
            calendars: this.state.calendars.map(function(cal) {
                if (cal.id == obj.id) {
                    return obj;
                }
                return cal;
            })
        });
    },
    render: function() {
        if (this.state.calErr) {
            return <div>
                <span className="status-error">{this.state.calErr}</span>
            </div>;
        }
        if (!this.state.calLoaded) {
            return <div>
                <span className="status-waiting">Getting data…</span>
            </div>;
        }

        // cal is either an object or null (for the "add new" form).
        function createCalComp(cal) {
            return <li key={cal ? cal.id : 'add-new-cal-item'}>
                    <Calendar
                        model={cal}
                        onDelete={this.onDelete}
                        onCreate={this.onCreate}
                        onUpdate={this.onUpdate}
                    />
                </li>;
        }
        return <div>
            {this.state.calendars.length ? '' :
                <span className="info">
                    You have not entered any calendars.
                </span>}
            <ul id="calendar-list">
                {this.state.calendars.map(createCalComp, this)}
                {createCalComp.bind(this)(null)}
            </ul>
        </div>;
    }
});

var Calendar = React.createClass({
    mixins: [
        getPropModelClonerMixin({
            id: null,
            email: ''
        }),
    ],
    propTypes: {
        model: React.PropTypes.object,
        onDelete: React.PropTypes.func.isRequired,
        onCreate: React.PropTypes.func.isRequired,
        onUpdate: React.PropTypes.func.isRequired
    },
    getInitialState: function() {
        var state = {
            reqInFlight: '',
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
    updateOrCreate: function(evt) {
        evt.preventDefault();
        this.setState({
            reqInFlight: this.isNewItem() ? 'Creating…' : 'Updating…'
        });

        var url;
        if (this.isNewItem()) {
            url = apiRoot + 'calendars/';
        } else {
            url = apiRoot + 'calendars/' + this.props.model.id + '/';
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
            url: apiRoot + 'calendars/' + this.props.model.id + '/',
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
            return <div>Deleted</div>;
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
                    {this.props.model.email}
                    <button type="button"
                        onClick={this.edit}
                        disabled={this.state.reqInFlight}>Edit</button>
                    <button type="button"
                        onClick={this.delete}
                        disabled={this.state.reqInFlight}>Delete</button>
                    {statusBox}
                </div>;
        }

        return <form onSubmit={this.updateOrCreate}>
                <input type="text"
                    placeholder="Calendar email…"
                    value={this.state.editModel.email}
                    onChange={this.handleChange.bind(this, 'email')}
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
