QUnit.test('clone model', function(assert) {
    assert.strictEqual(clone(null), null);
    assert.strictEqual(clone(undefined), undefined);
    assert.strictEqual(clone(3), 3);
    assert.strictEqual(clone(true), true);
    assert.strictEqual(clone(false), false);
    assert.strictEqual(clone(''), '');
    assert.strictEqual(clone('john'), 'john');

    assert.deepEqual(clone([]), []);
    assert.deepEqual(clone([8]), [8]);
    assert.deepEqual(clone([8, 'apple']), [8, 'apple']);

    assert.deepEqual(clone({}), {});
    assert.deepEqual(clone({item: 'apples'}), {item: 'apples'});
    (function() {
        var x = {a: 5, b: {name: 'John'}};
        var y = clone(x);
        assert.deepEqual(x, y);
        // make sure y.b points to a different object than x.b
        assert.notStrictEqual(x.b, y.b);
    })();

    assert.deepEqual({items: [{name: 'chocolate'}, 'milk']},
                     {items: [{name: 'chocolate'}, 'milk']});
    assert.deepEqual({a: 3, b: '4'}, {b: '4', a: 3});
});

QUnit.test('sameModels()', function(assert) {
    assert.strictEqual(true, sameModels(null, null));
    assert.strictEqual(true, sameModels(undefined, undefined));
    assert.strictEqual(true, sameModels('', ''));
    assert.strictEqual(true, sameModels('apple', 'apple'));
    assert.strictEqual(true, sameModels(5, 5));
    assert.strictEqual(true, sameModels([], []));
    assert.strictEqual(true, sameModels(
            [{who: 'me', where: ['beach', 'water']}],
            [{where: ['beach', 'water'], who: 'me'}]));

    assert.strictEqual(false, sameModels(null, undefined));
    assert.strictEqual(false, sameModels('5', 5));
    assert.strictEqual(false, sameModels({who: 5}, {who: '5'}));
    assert.strictEqual(false, sameModels({}, {a: 1}));
    assert.strictEqual(false, sameModels({a: 1}, {}));
    assert.strictEqual(false, sameModels({a: 1}, {b: 1}));
    assert.strictEqual(false, sameModels({a: 1}, {a: 2}));
    assert.strictEqual(false, sameModels(['a'], []));
    assert.strictEqual(false, sameModels([], ['a']));
    assert.strictEqual(false, sameModels(['a'], ['b']));
    assert.strictEqual(false, sameModels(['3'], [3]));
});

QUnit.test('dropSeconds', function(assert) {
    var inOut = {
        '08:30:15': '08:30',
        '11:00:00': '11:00',
        '3:12': '3:12',
        '17:45': '17:45'
    };
    Object.keys(inOut).forEach(function(k) {
        assert.strictEqual(dropSeconds(k), inOut[k]);
    });
});

QUnit.test('enumSentence', function(assert) {
    assert.strictEqual(enumSentence([]), '');
    assert.strictEqual(enumSentence(['Andy']), 'Andy');
    assert.strictEqual(enumSentence(['Alice', 'Bob']), 'Alice and Bob');
    assert.strictEqual(enumSentence(['Peter', 'Paul', 'Mary']),
        'Peter, Paul and Mary');
    assert.strictEqual(enumSentence(['John', 'Paul', 'George', 'Ringo']),
        'John, Paul, George and Ringo');
});

QUnit.test('normalize weekday index', function(assert) {
    [
        [0, 0], [1, 1], [6, 6],
        [7, 0], [15, 1],
        [-1, 6], [-2, 5], [-6, 1], [-7, 0], [-8, 6],
        [-15, 6]
    ].forEach(function(tuple) {
        assert.strictEqual(normalizeWeekdayIndex(tuple[0]), tuple[1]);
    });
});

QUnit.test('week offset', function(assert) {
    [
        [0, 0], [1, 0], [6, 0],
        [7, 1], [13, 1], [14, 2], [15, 2],
        [-1, -1], [-2, -1], [-7, -1],
        [-8, -2], [-14, -2], [-15, -3]
    ].forEach(function(tuple) {
        assert.strictEqual(weekOffset(tuple[0]), tuple[1]);
    });
});
