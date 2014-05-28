/** @jsx React.DOM */

var ScheduleTemplatesList = React.createClass({
    getInitialState: function() {
        return {
            schedTempl: [],
            schedTemplLoaded: false,
            schedTemplErr: '',

            timezones: [],
            tzLoaded: false,
            tzErr: ''
        };
    },
    fetchData: function() {
        var f = compFetchRest.bind(this);
        f('/futuintro/api/scheduletemplates/', 'schedTempl',
            'schedTemplLoaded', 'schedTemplErr');
        f('/futuintro/api/timezones/', 'timezones',
            'tzLoaded', 'tzErr');
    },
    refresh: function() {
        this.setState(this.getInitialState());
        this.fetchData();
    },
    componentDidMount: function() {
        this.fetchData();
    },
    onDelete: function(deletedObj) {
        this.setState({
            schedTempl: this.state.schedTempl.filter(function(st) {
                return st.id != deletedObj.id;
            })
        });
    },
    onCreate: function(createdObj) {
        this.setState({
            schedTempl: this.state.schedTempl.concat(createdObj)
        });
    },
    onUpdate: function(newObj) {
        this.setState({
            schedTempl: this.state.schedTempl.map(function(st) {
                if (st.id == newObj.id) {
                    return newObj;
                }
                return st;
            })
        });
    },
    render: function() {
        if (this.state.schedTemplErr || this.state.tzErr) {
            return (
                <div>{this.state.schedTemplErr || this.state.tzErr}</div>
            );
        }

        if (!(this.state.schedTemplLoaded && this.state.tzLoaded)) {
            return <div>Loading…</div>;
        }

        return <div>
            <ul>
                {this.state.schedTempl.map((function(st) {
                    return <li key={st.id || 'add-new-st-item'}>
                        <ScheduleTemplateSummary
                            model={st}
                            allTimezones={this.state.timezones}
                            onDelete={this.onDelete}
                            onUpdate={this.onUpdate}
                            />
                    </li>;
                }).bind(this))}
                <li>
                    <ScheduleTemplateSummary
                        model={null}
                        allTimezones={this.state.timezones}
                        onCreate={this.onCreate}
                        />
                </li>
            </ul>
        </div>;
    }
});

/*
 * Display, edit and delete a ScheduleTemplate, or create a new one.
 *
 * The model is either a plain JS object to display, edit or delete an item
 * or null to show a form for creating a new one.
 */
var ScheduleTemplateSummary = React.createClass({
    mixins: [
        getPropModelClonerMixin({
            id: null,
            name: '',
            timezone: 0
        }),
    ],
    propTypes: {
        model: React.PropTypes.object,
        allTimezones: React.PropTypes.array.isRequired,

        onCreate: React.PropTypes.func,
        onUpdate: React.PropTypes.func,
        onDelete: React.PropTypes.func
    },
    getInitialState: function() {
        var state = {
            // for existing items: nothing to display anymore
            deleted: false,

            ajaxInFlight: '',
            ajaxErr: '',

            editing: this.isNewItem()
        };
        if (state.editing) {
            // mutable model used only in edit mode
            // and reset every time we enter edit mode.
            state.editModel = this.copyInitialModel();
        }
        return state;
    },
    getTimezoneName: function(tzId) {
        for (var i = 0; i < this.props.allTimezones.length; i++) {
            var crt = this.props.allTimezones[i];
            if (crt.id == tzId) {
                return crt.name;
            }
        }
        console.log('Unknown timezone ID', tzId);
        return 'UNKONWN!';
    },
    edit: function() {
        this.setState({
            editing: true,
            // reset the editModel every time we enter edit mode
            editModel: this.copyInitialModel(),
            ajaxErr: '',
        });
    },
    cancelEdit: function() {
        this.setState({
            editing: false,
            ajaxErr: ''
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
            ajaxInFlight: this.isNewItem() ? 'Creating…' : 'Saving…'
        });

        var url;
        if (this.isNewItem()) {
            url = '/futuintro/api/scheduletemplates/';
        } else {
            url = '/futuintro/api/scheduletemplates/' + this.props.model.id + '/';
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
            data: JSON.stringify(this.state.editModel),
            complete: (function(data) {
                this.isMounted() && this.setState({
                    ajaxInFlight: ''
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
                    ajaxErr: '',
                    editing: false
                });
            }).bind(this),
            error: (function(xhr, txtStatus, saveErr) {
                this.setState({ajaxErr: getAjaxErr.apply(this, arguments)});
            }).bind(this)
        });
        }).bind(this), 3000);
    },
    delete: function() {
        if (!confirm('Delete this Schedule Template ' +
                    'and all its Event Templates?')) {
            return;
        }

        this.setState({
            ajaxInFlight: 'Deleting…'
        });

        // TODO: remove the setTimeout (tests delays in DEV).
        setTimeout((function() {
        $.ajax({
            url: '/futuintro/api/scheduletemplates/' + this.props.model.id + '/',
            type: 'DELETE',
            headers: {
                'X-CSRFToken': $.cookie('csrftoken')
            },
            complete: (function(data) {
                this.isMounted() && this.setState({
                    ajaxInFlight: ''
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
                this.setState({ajaxErr: getAjaxErr.apply(this, arguments)});
            }).bind(this)
        });
        }).bind(this), 3000);
    },

    render: function() {
        var statusBox;

        if (this.state.deleted) {
            return <div>Deleted.</div>;
        }
        if (this.state.ajaxInFlight || this.state.ajaxErr) {
            statusBox = <span
                className={'status-' +
                    (this.state.ajaxInFlight ? 'info' : 'error')}>
                {this.state.ajaxInFlight || this.state.ajaxErr}
            </span>;
        }

        if (!this.state.editing) {
            return <div>
                {this.props.model.name} {' '}
                ({this.getTimezoneName(this.props.model.timezone)})
                <button type="button"
                    onClick={this.edit}
                    disabled={this.state.ajaxInFlight}>
                    Edit
                </button>
                <button type="button"
                    onClick={this.delete}
                    disabled={this.state.ajaxInFlight}>
                    Delete
                </button>
                {statusBox}
            </div>;
        }

        return <form onSubmit={this.saveOrCreate}>
            <input type="text"
                placeholder="Name of this Schedule Template…"
                value={this.state.editModel.name}
                onChange={this.handleChange.bind(this, 'name')}
                disabled={this.state.ajaxInFlight}
                />
            <select
                value={this.state.editModel.timezone}
                onChange={this.handleChange.bind(this, 'timezone')}
                disabled={this.state.ajaxInFlight}
                >
                <option value={0}>–</option>
                {this.props.allTimezones.map(function(tz) {
                    // Don't need the key here, just silencing React warning
                    return <option key={tz.id} value={tz.id}>{tz.name}</option>;
                })}
            </select>
            <button type="submit" disabled={this.state.ajaxInFlight}>
                {this.isNewItem() ? 'Create' : 'Save'}
            </button>
            <button type="button"
                onClick={this.cancelEdit}
                disabled={this.state.ajaxInFlight}
                hidden={this.isNewItem()}
                >
                Cancel
            </button>
            <button type="reset"
                disabled={this.state.ajaxInFlight}
                hidden={!this.isNewItem()}
                >
                Clear
            </button>

            {statusBox}
        </form>;
    }
});
