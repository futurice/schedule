/** @jsx React.DOM */

var SchedulingRequestsList = React.createClass({
    mixins: [
        getRestLoaderMixin('/futuintro/api/schedulingrequests/?ordering=-requestedAt',
            'sReq', 'sReqLoaded', 'sReqErr'),
        getRestLoaderMixin('/futuintro/api/users/',
            'users', 'usersLoaded', 'usersErr', function() {
                var usersById = {};
                this.state.users.forEach(function(u) {
                    usersById[u.id] = u;
                });
                this.setState({
                    usersById: usersById
                });
            })
    ],
    getInitialState: function() {
        return {
            sReq: null,
            sReqLoaded: false,
            sReqErr: '',

            users: null,
            usersLoaded: false,
            usersErr: '',
            usersById: null,
        };
    },
    render: function() {
        var err = this.state.sReqErr || this.state.usersErr;
        if (err) {
            return <div><span className="status-error">{err}</span></div>;
        }
        var loaded = this.state.sReqLoaded && this.state.usersLoaded &&
            this.state.usersById;
        if (!loaded) {
            return <div><span className="status-waiting">Loading…</span></div>;
        }

        return <ul>
            {this.state.sReq.map((function(r) {
                return <li key={r.id}>
                    <SchedulingRequest
                        model={r}
                        usersById={this.state.usersById}
                    />
                </li>;
            }).bind(this))}
        </ul>;
    }
});

var SchedulingRequest = React.createClass({
    propTypes: {
        model: React.PropTypes.object.isRequired,
        usersById: React.PropTypes.object.isRequired
    },
    getInitialState: function() {
        return {
            showDeleteBtn: true,
            ajaxInFlight: '',
            ajaxErr: ''
        };
    },
    delete: function() {
        if (confirm('Delete ALL events from Google Calendar?')) {
            this.setState({
                ajaxInFlight: 'Deleting…'
            });
            $.ajax({
                url: '/futuintro/scheduling-request/' +
                    this.props.model.id + '/',
                type: 'DELETE',
                headers: {'X-CSRFToken': $.cookie('csrftoken')},
                complete: (function(data) {
                    this.setState({
                        ajaxInFlight: ''
                    });
                }).bind(this),
                success: (function(data) {
                    this.setState({
                        ajaxErr: ''
                    });
                }).bind(this),
                error: (function(xhr, txtStatus, saveErr) {
                    this.setState({ajaxErr: getAjaxErr.apply(this, arguments)});
                }).bind(this)
            });
            this.setState({
                showDeleteBtn: false
            });
        }
    },
    render: function() {
        var user = this.props.usersById[this.props.model.requestedBy];
        var userText = "Unknown user";
        if (user) {
            userText = user.first_name + ' ' + user.last_name + ' (' +
                user.email + ')';
        }
        var deleteBox;
        if (this.state.showDeleteBtn) {
            deleteBox = <div>
                    <button type="button" onClick={this.delete}>Delete</button>
                </div>;
        } else if (this.state.ajaxInFlight) {
            deleteBox = <div>
                <span className='status-waiting'>
                    {this.state.ajaxInFlight}
                </span>
            </div>;
        } else if (this.state.ajaxErr) {
            deleteBox = <div>
                <span className='status-error'>{this.state.ajaxErr}</span>
            </div>;
        } else {
            deleteBox = <div>
                <span className='info'>Deleted</span>
            </div>;
        }

        return <div>
            Submitted on {new Date(this.props.model.requestedAt).toString()}
            {' '} by {userText}.
            <br/>
            Status: {this.props.model.status}.
            {this.props.model.status == 'ERROR' ?
                <PreviewExpandBox text={this.props.model.error}/> : ''}
            {deleteBox}
        </div>;
    }
});
