/** @jsx React.DOM */

var SchedulingRequestDetail = React.createClass({
    propTypes: {
        id: React.PropTypes.number.isRequired
    },
    render: function() {
        return <span>Scheduling Request {this.props.id}</span>;
    }
});
