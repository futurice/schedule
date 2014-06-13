/** @jsx React.DOM */

var SchedulingRequestsList = React.createClass({
    mixins: [
        getRestLoaderMixin('/futuintro/api/schedulingrequests/?ordering=-requestedAt',
            'sReq', 'sReqLoaded', 'sReqErr'),
        getRestLoaderMixin('/futuintro/api/schedules/',
            'schedules', 'schedulesLoaded', 'schedulesErr'),
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

            schedules: null,
            schedulesLoaded: false,
            schedulesErr: '',

            users: null,
            usersLoaded: false,
            usersErr: '',
            usersById: null
        };
    },
    render: function() {
        var err;
        ['sReqErr', 'schedulesErr', 'usersErr'].forEach((function(field) {
            err = err || this.state[field];
        }).bind(this));
        if (err) {
            return <div><span className="status-error">{err}</span></div>;
        }

        var loaded = true;
        ['sReqLoaded', 'schedulesLoaded', 'usersLoaded', 'usersById'].forEach(
                (function(field) {
            loaded = loaded && Boolean(this.state[field]);
        }).bind(this));
        if (!loaded) {
            return <div><span className="status-waiting">Loading…</span></div>;
        }

        if (!this.state.sReq.length) {
            return <div>
                <span className="info">
                    There are no requests to make schedules.
                </span>
            </div>;
        }

        if (!this.state.sReq.length) {
            return <div>
                <span className="info">
                    There are no requests to make schedules.
                </span>
            </div>;
        }

        return <ul>
            {this.state.sReq.map((function(r) {
                return <li key={r.id}>
                    <SchedulingRequest
                        model={r}
                        usersById={this.state.usersById}
                        schedules={this.state.schedules.filter(function(s) {
                            return s.schedulingRequest == r.id;
                        })}
                    />
                </li>;
            }).bind(this))}
        </ul>;
    }
});

var SchedulingRequest = React.createClass({
    propTypes: {
        model: React.PropTypes.object.isRequired,
        usersById: React.PropTypes.object.isRequired,
        schedules: React.PropTypes.array.isRequired
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
        var userText = getUserNameAndEmail(this.props.model.requestedBy,
                this.props.usersById);
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

        var status = this.props.model.status;

        var link = <span>
                For {enumSentence(this.props.schedules.map((function(s){
                    return getUserName(s.forUser, this.props.usersById);
                }).bind(this)))}
            </span>;
        if (status == 'SUCCESS') {
            link = <a href={'../scheduling-request/' + this.props.model.id}>
                    {link}
                </a>;
        }
        return <div>
            {link}
            <br/>
            Submitted on {new Date(this.props.model.requestedAt).toString()}
            {' '} by {userText}

            {status != 'SUCCESS' ? <br/> : ''}
            {status != 'SUCCESS' ? 'Status: ' + this.props.model.status : ''}

            {this.props.model.status == 'ERROR' ?
                <PreviewExpandBox text={this.props.model.error}/> : ''}
            {deleteBox}
        </div>;
    }
});
