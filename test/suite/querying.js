'use strict'

const assert = require('assert').strict
const expect = require('expect.js')

const Attachment = require('../models/attachment')
const Book = require('../models/book')
const Comment = require('../models/comment')
const Like = require('../models/like')
const Post = require('../models/post')
const Tag = require('../models/tag')
const TagMap = require('../models/tagMap')

describe('=> Query', function() {
  before(async function() {
    await Promise.all([
      Post.create({ id: 1, title: 'New Post', createdAt: new Date(2017, 10) }),
      Post.create({ id: 2, title: 'Archbishop Lazarus', createdAt: new Date(2017, 10) }),
      Post.create({ id: 3, title: 'Archangel Tyrael', isPrivate: true }),
      Post.create({ id: 4, title: 'Diablo', deletedAt: new Date(2012, 4, 15) })
    ])
  })

  after(async function() {
    await Post.remove({}, true)
  })

  it('.all', async function() {
    const posts = await Post.all
    expect(posts.length).to.be(3)
    expect(posts.map(post => post.title)).to.contain('New Post')
  })

  it('.first', async function() {
    const post = await Post.first
    expect(post).to.be.a(Post)
    expect(post.title).to.be('New Post')
  })

  it('.last', async function() {
    const post = await Post.last
    expect(post).to.be.a(Post)
    expect(post.title).to.be('Archangel Tyrael')
  })

  it('.unscoped', async function() {
    const posts = await Post.unscoped.all
    expect(posts.length).to.be(4)
    const post = await Post.unscoped.last
    expect(post).to.eql(posts[3])
  })

  it('.get()', async function() {
    expect(await Post.get(0)).to.eql(await Post.first)
    expect(await Post.get(2)).to.eql(await Post.last)
    expect(await Post.unscoped.get(2)).to.eql(await Post.unscoped.last)
  })

  it('.findOne()', async function() {
    const post = await Post.findOne()
    expect(post).to.be.a(Post)
    expect(post.id).to.be.ok()
  })

  it('.findOne(id)', async function() {
    const post = await Post.first
    expect(await Post.findOne(post.id)).to.eql(post)
  })

  // the same as Model.all
  it('.find()', async function() {
    const posts = await Post.find()
    expect(posts.length).to.be(3)
    expect(posts.map(post => post.title)).to.contain('New Post')
  })

  it('.find(id)', async function() {
    const post = await Post.first
    const posts = await Post.find(post.id)
    expect(posts.length).to.be(1)
    expect(posts[0]).to.be.a(Post)
    expect(posts[0].title).to.eql('New Post')
  })

  it('.find([ id ])', async function() {
    const postIds = (await Post.all).map(post => post.id)
    const posts = await Post.find(postIds)
    expect(posts.map(post => post.title)).to.contain('New Post')
  })

  it('.find({ foo })', async function() {
    const posts = await Post.find({ title: 'New Post' })
    expect(posts.length).to.be(1)
    expect(posts[0]).to.be.a(Post)
    expect(posts[0].title).to.be('New Post')
  })

  it('.find({ foo: null })', async function() {
    const posts = await Post.find({ thumb: null })
    expect(posts.length).to.be(3)
    expect(posts[0]).to.be.a(Post)
    expect(posts[0].thumb).to.eql(null)
  })

  it('.find({ foo: [] })', async function() {
    const posts = await Post.find({ title: ['New Post', 'Archangel Tyrael'] }).order('id')
    expect(posts.length).to.be(2)
    expect(posts.map(post => post.title)).to.eql([
      'New Post', 'Archangel Tyrael'
    ])
  })

  it('.find({ foo: Set })', async function() {
    const posts = await Post.find({ title: new Set(['New Post', 'Archangel Tyrael']) }).order('id')
    expect(posts.map(post => post.title)).to.eql([
      'New Post', 'Archangel Tyrael'
    ])
  })

  it('.find({ foo: Date })', async function() {
    const posts = await Post.find('createdAt <= ?', new Date(2017, 11)).order('id')
    expect(posts.map(post => post.title)).to.eql(['New Post', 'Archbishop Lazarus'])
  })

  it('.find({ foo: boolean })', async function() {
    const posts = await Post.find({ isPrivate: true })
    expect(posts.map(post => post.title)).to.eql([ 'Archangel Tyrael' ])
    expect((await Post.find({ isPrivate: false })).length).to.be(2)
  })

  it('.find { limit }', async function() {
    const posts = await Post.find({}, { limit: 1 })
    expect(posts.length).to.equal(1)
    expect(posts[0]).to.be.a(Post)
  })

  it('.find { order }', async function() {
    const posts = await Post.find({}, { order: 'id desc', limit: 3 })
    expect(posts[0].id).to.be.above(posts[1].id)
    expect(posts[1].id).to.be.above(posts[2].id)
  })

  it('.find { offset }', async function() {
    const posts1 = await Post.find({}, { order: 'id asc', limit: 3 })
    const posts2 = await Post.find({}, { order: 'id asc', limit: 3, offset: 1 })

    expect(posts1[1].id).to.equal(posts2[0].id)
    expect(posts1[2].id).to.equal(posts2[1].id)
  })

  it('.find { select }', async function() {
    const post = await Post.findOne({ title: 'New Post' }, { select: 'title' })
    expect(post.title).to.equal('New Post')
    expect(() => post.content).to.throwError()
  })

  it('.find aliased attribute', async function() {
    const post = await Post.findOne({ deletedAt: { $ne: null } })
    expect(post.deletedAt).to.be.a(Date)
  })

  it('.find undefined', async function() {
    const post = await Post.findOne({ extra: undefined })
    expect(post.extra).to.be(null)
  })
})

describe('=> Query $op', function() {
  before(async function() {
    await Post.create({ id: 1, title: 'New Post', createdAt: new Date(2012, 4, 15) })
    await Post.create({ id: 2, title: 'Diablo' })
    await Post.create({ id: 99, title: 'Leah' })
    await Post.create({ id: 100, title: 'Deckard Cain' })
  })

  after(async function() {
    await Post.remove({}, true)
  })

  it('.find $eq', async function() {
    const posts = await Post.find({ title: { $eq: 'New Post' } })
    expect(posts.length).to.be.above(0)
    expect(posts[0].title).to.equal('New Post')
  })

  it('.find $eq Date', async function() {
    const posts = await Post.find({ createdAt: { $eq: new Date(2012, 4, 15) } })
    expect(posts.length).to.be(1)
    expect(posts[0].title).to.be('New Post')
  })

  it('.find $gt', async function() {
    const posts = await Post.find({ id: { $gt: 99 } }, { limit: 10 })
    expect(posts.length).to.be.above(0)
    expect(posts[0].id).to.be.above(99)
  })

  it('.find $gte', async function() {
    const posts = await Post.find({ id: { $gte: 100 }}, { limit: 10 })
    expect(posts.length).to.be.above(0)
    expect(posts[0].id).to.be.above(99)
  })

  it('.find $lt', async function() {
    const posts = await Post.find({ id: { $lt: 100 }}, { limit: 10 })
    expect(posts.length).to.be.above(0)
    expect(posts[0].id).to.be.below(100)
  })

  it('.find $lte', async function() {
    const posts = await Post.find({ id: { $lte: 99 }}, { limit: 10 })
    expect(posts.length).to.be.above(0)
    expect(posts[0].id).to.be.below(100)
  })

  it('.find $ne', async function() {
    const posts = await Post.find({ id: { $ne: 100 }}, { limit: 10 })
    expect(posts.some(post => post.id == 100)).to.not.be.ok()
  })

  it('.find $between', async function() {
    const post = await Post.findOne({ id: { $between: [90, 100] }})
    expect(post.id).to.be.above(90)
    expect(post.id).to.be.below(100)
  })

  it('.find $notBetween', async function() {
    const post = await Post.findOne({ id: { $notBetween: [1, 2] }})
    expect(post.id).to.be.above(2)
  })

  it('.find $in', async function() {
    const post = await Post.findOne({ id: { $in: [1, 2, 3] } })
    expect(post.id).to.equal(1)
  })

  it('.find $notIn or $nin', async function() {
    const post1 = await Post.findOne({ id: { $nin: [1, 2, 3]} })
    expect(post1.id).to.above(3)
    const post2 = await Post.findOne({ id: { $notIn: [1, 2, 3]} })
    expect(post2.id).to.above(3)
  })

  it('.find $like', async function() {
    const post = await Post.findOne({ title: { $like: '%Post%' } })
    expect(post.title).to.match(/Post/)
  })

  it('.find $notLike', async function() {
    const post = await Post.findOne({ title: { $notLike: '%Post' } })
    expect(post.title).to.not.match(/Post/)
  })

  it('.find compound $op', async function() {
    const post = await Post.findOne({ id: { $gt: 90, $lt: 100 } })
    assert(post.id > 90 && post.id < 100)
  })

  it('.find mixed $op', async function() {
    const post = await Post.findOne({ id: { $gt: 90, $lt: 100 } }).where('deletedAt != NULL or updatedAt != NULL')
    assert(post.id > 90 && post.id < 100)
  })
})

describe('=> Where', function() {
  before(async function() {
    await Promise.all([
      Post.create({ title: 'New Post', authorId: 1 }),
      Post.create({ title: 'Skeleton King', authorId: 1 }),
      Post.create({ title: 'Archbishop Lazarus', authorId: 2 })
    ])
  })

  after(async function() {
    await Post.remove({}, true)
  })

  it('.where({ foo, bar })', async function() {
    const posts = await Post.where({ title: ['New Post', 'Skeleton King'], authorId: 2 })
    expect(posts).to.be.empty()
  })

  it('.where(query, ...values)', async function() {
    const posts = await Post.where('title = ? and authorId = ?', ['New Post', 'Skeleton King'], 2)
    expect(posts).to.be.empty()
  })

  it('.where(compoundQuery, ...values)', async function() {
    const posts = await Post.where('authorId = ? || (title = ? && authorId = ?)', 2, 'New Post', 1).order('authorId')
    expect(posts.length).to.be(2)
    expect(posts[0].title).to.equal('New Post')
    expect(posts[0].authorId).to.equal(1)
    expect(posts[1].title).to.equal('Archbishop Lazarus')
    expect(posts[1].authorId).to.equal(2)
  })

  it('.orWhere(query, ...values)', async function() {
    const posts = await Post.where('title = ?', 'New Post').orWhere('title = ?', 'Skeleton King').order('title')
    assert.deepEqual(Array.from(posts, post => post.title), ['New Post', 'Skeleton King'])
  })
})

describe('=> Select', function() {
  before(async function() {
    await Post.create({ id: 1, title: 'New Post', createdAt: new Date(2012, 4, 15) })
  })

  after(async function() {
    await Post.remove({}, true)
  })

  it('.select(...name)', async function() {
    const post = await Post.select('id', 'title').first
    expect(post.toJSON()).to.eql({ id: 1, title: 'New Post' })
  })

  it('.select(names[])', async function() {
    const post = await Post.select(['id', 'title']).first
    expect(post.toJSON()).to.eql({ id: 1, title: 'New Post' })
  })

  it('.select(name => filter(name))', async function() {
    const post = await Post.select(name => name == 'id' || name == 'title').first
    expect(post.toJSON()).to.eql({ id: 1, title: 'New Post' })
  })

  it('.select("...name")', async function() {
    const post = await Post.select('id, title').first
    expect(post.toJSON()).to.eql({ id: 1, title: 'New Post' })
  })
})

describe('=> Scopes', function() {
  before(async function() {
    const results = await Promise.all([
      Post.create({ title: 'New Post', deletedAt: new Date() }),
      Tag.create({ name: 'npc', type: 0 })
    ])
    const [postId, tagId] = results.map(result => result.id)
    await TagMap.create({ targetId: postId, targetType: 0, tagId })
  })

  after(async function() {
    await Promise.all([
      Post.remove({}, true),
      Tag.remove({}, true),
      TagMap.remove({}, true)
    ])
  })

  it('.find({ deleteAt: null }) by default', async function() {
    expect(await Post.findOne({ title: 'New Post' })).to.be(null)
  })

  it('.find().unscoped removes default scopes', async function() {
    const post = await Post.findOne({ title: 'New Post' }).unscoped
    expect(post).to.be.a(Post)
    expect(post.title).to.be('New Post')
  })

  it('.update().unscoped', async function() {
    await Post.update({ title: 'New Post' }, { title: 'Skeleton King' })
    expect(await Post.findOne({ title: 'Skeleton King' })).to.be(null)
    await Post.update({ title: 'New Post' }, { title: 'Skeleton King' }).unscoped
    expect(await Post.findOne({ title: 'New Post' })).to.be(null)
  })
})

describe('=> Count / Group / Having', function() {
  before(async function() {
    await Promise.all([
      Post.create({ title: 'New Post' }),
      Post.create({ title: 'New Post' }),
      Post.create({ title: 'Archbishop Lazarus' }),
      Post.create({ title: 'Archangel Tyrael' })
    ])
  })

  after(async function() {
    await Post.remove({}, true)
  })

  it('Bone.count()', async function() {
    expect(await Post.count()).to.eql([ { count: 4 } ])
    expect(await Post.where('title like "Arch%"').count()).to.eql([ { count: 2 } ])
  })

  it('Bone.group().count()', async function() {
    expect(await Post.group('title').count().order('count').order('title')).to.eql([
      { count: 1, title: 'Archangel Tyrael' },
      { count: 1, title: 'Archbishop Lazarus' },
      { count: 2, title: 'New Post' }
    ])
  })

  it('Bone.group().having()', async function() {
    expect(await Post.group('title').count().having('count > ?', 1)).to.eql([
      { count: 2, title: 'New Post' }
    ])
  })

  it('Bone.group().having().orHaving()', async function() {
    assert.deepEqual(
      await Post.group('title').count().having('count > 1').orHaving('title = ?', 'Archangel Tyrael').order('count', 'desc'),
      [ { count: 2, title: 'New Post' },
        { count: 1, title: 'Archangel Tyrael'} ]
    )
  })
})

describe('=> Group / Join / Subqueries', function() {
  before(async function() {
    const posts = await Promise.all([
      Post.create({ id: 1, title: 'New Post' }),
      Post.create({ id: 2, title: 'Archbishop Lazarus' }),
      Post.create({ id: 3, title: 'Archangel Tyrael' }),
      Post.create({ id: 4, title: 'New Post 2' })
    ])

    await Promise.all([
      Attachment.create({ postId: posts[0].id }),
      Attachment.create({ postId: posts[0].id }),
      Attachment.create({ postId: posts[1].id })
    ])

    await Promise.all([
      Comment.create({ articleId: posts[1].id, content: 'foo' }),
      Comment.create({ articleId: posts[1].id, content: 'bar' }),
      Comment.create({ articleId: posts[2].id, content: 'baz' })
    ])
  })

  after(async function() {
    await Promise.all([
      Post.remove({}, true),
      Comment.remove({}, true),
      Attachment.remove({}, true)
    ])
  })

  it('Bone.group() subquery', async function() {
    const posts = await Post.find({
      id: Comment.select('articleId').from(Comment.group('articleId').count().having('count > 0'))
    }).order('id').with('attachment')
    expect(posts.length).to.be(2)
    expect(posts[0].title).to.eql('Archbishop Lazarus')
    expect(posts[0].attachment).to.be.an(Attachment)
    expect(posts[0].attachment.id).to.be.ok()
    expect(posts[1].title).to.eql('Archangel Tyrael')
    expect(posts[1].attachment).to.be(null)
  })

  it('Bone.group().join()', async function() {
    const comments = await Comment.join(Post, 'comments.articleId = posts.id')
      .select('count(comments.id) as count', 'posts.title').group('comments.articleId').order('count')
    expect(comments).to.eql([
      { '': { count: 1 }, comments: { articleId: 3 }, posts: { title: 'Archangel Tyrael' } },
      { '': { count: 2 }, comments: { articleId: 2 }, posts: { title: 'Archbishop Lazarus' } }
    ])
  })

  it('Bone.join().count()', async function() {
    const query = Post.find({ title: ['Archangel Tyrael', 'New Post'], deletedAt: null })
    const [{ count }] = await query.count()
    const posts = await query.order('title').with('attachment')
    expect(posts.length).to.equal(count)
    expect(posts[0]).to.be.a(Post)
    expect(posts[0].title).to.equal('Archangel Tyrael')
    expect(posts[0].attachment).to.be(null)
    expect(posts[1].attachment).to.be.an(Attachment)
    expect(posts[1].attachment.postId).to.equal(posts[1].id)
  })

  it('Bone.join().group()', async function() {
    const query = Post.include('comments').group('title').count('comments.id').having('count > 0').order('count')
    expect(await query).to.eql([
      { '': { count: 1 }, posts: { title: 'Archangel Tyrael' } },
      { '': { count: 2 }, posts: { title: 'Archbishop Lazarus' } }
    ])
    expect(await query.select('posts.title')).to.eql([
      { '': { count: 1 }, posts: { title: 'Archangel Tyrael' } },
      { '': { count: 2 }, posts: { title: 'Archbishop Lazarus' } }
    ])
  })

  // check if the ORDER fields are handled correctly when the attribute name and field name are different.
  it('Bone.join().order()', async function() {
    const query = Post.include('comments').order('updatedAt', 'desc').order('id', 'desc')
    assert.deepEqual((await query)[0], await query.first)
  })
})

describe('=> Calculations', function() {
  before(async function() {
    await Promise.all([
      Book.create({ isbn: 9780596006624, name: 'Hackers and Painters', price: 22.95 }),
      Book.create({ isbn: 9780881792065, name: 'The Elements of Typographic Style', price: 29.95 }),
      Book.create({ isbn: 9781575863269, name: 'Things a Computer Scientist Rarely Talks About', price: 21 })
    ])
  })

  after(async function() {
    await Book.remove({}, true)
  })

  it('Bone.count() should count records', async function() {
    const [ { count } ] = await Book.count()
    expect(count).to.equal(3)
  })

  it('Bone.average() should return the average of existing records', async function() {
    const [ { average } ] = await Book.average('price')
    expect(Math.abs((22.95 + 29.95 + 21) / 3 - average)).to.be.within(0, 1)
  })

  it('Bone.minimum() should return the minimum value of existing records', async function() {
    const [ { minimum } ] = await Book.minimum('price')
    expect(parseFloat(minimum)).to.equal(21)
  })

  it('Bone.maximum() should return the maximum value of existing records', async function() {
    const [ { maximum } ] = await Book.maximum('price')
    expect(Math.floor(maximum)).to.equal(Math.floor(29.95))
  })

  it('Bone.sum()', async function() {
    const [ { sum } ] = await Book.sum('price')
    expect(Math.floor(sum)).to.equal(Math.floor(22.95 + 29.95 + 21))
  })
})

describe('=> Batch', function() {
  before(async function() {
    await Promise.all([
      Post.create({ title: 'New Post' }),
      Post.create({ title: 'New Post 2' }),
      Post.create({ title: 'New Post 3' })
    ])
  })

  after(async function() {
    await Post.remove({}, true)
  })

  it('spell.batch', async function() {
    const posts = []
    for await (const post of Post.all.batch(1)) {
      posts.push(post)
    }
    assert.deepEqual(posts, Array.from(await Post.all))
  })
})

describe('=> Transaction', function() {
  afterEach(async function() {
    await Post.remove({}, true)
  })

  it('Bone.transaction()', async function() {
    await Post.transaction(function* () {
      yield new Post({ title: 'Leah' }).create()
      yield new Post({ title: 'Diablo' }).create()
    })

    const posts = await Post.find()
    expect(posts.map(post => post.title)).to.eql(['Leah', 'Diablo'])
  })

  it('should be able to rollback transaction', async function() {
    await assert.rejects(async function() {
      await Post.transaction(function* () {
        yield new Post({ title: 'Leah' }).create()
        yield new Post({ title: 'Diablo' }).create()
        throw new Error('rollback')
      })
    }, /rollback/)

    const posts = await Post.find()
    assert(posts.length === 0)
  })

  it('should not interfere with other connections', async function() {
    await Promise.all([
      Post.transaction(function* () {
        yield new Post({ title: 'Leah' }).create()
        yield new Post({ title: 'Diablo' }).create()
        throw new Error('rollback')
      }).catch(() => {}),
      new Post({ title: 'Archangel Tyrael' }).create()
    ])

    const posts = await Post.find()
    expect(posts.map(post => post.title)).to.eql(['Archangel Tyrael'])
  })
})

// a very premature sharding check
describe('=> Sharding', function() {
  after(async function() {
    await Post.remove({}, true)
    await Like.remove({ userId: 1 }, true)
  })

  it('should function properly if sharding key is not defined', async function() {
    await new Post({ title: 'Leah' }).create()
    const post = await Post.findOne()
    expect(post.id).to.be.ok()
    expect(post.title).to.eql('Leah')
    await post.remove()
  })

  it('should throw if sharding key is defined but not set when INSERT', async function() {
    await assert.rejects(async () => {
      await new Like({ articleId: 1 }).create()
    }, /sharding key/i)
  })

  it('should not throw if sharding key is defined and set when INSERT', async function() {
    await assert.doesNotReject(async () => {
      await new Like({ userId: 1, articleId: 1 }).create()
    }, /sharding key/i)
  })

  it('should throw if sharding key is defined but not present in where conditions when SELECT', async function() {
    await assert.rejects(async () => {
      await Like.find()
    }, /sharding key/i)
  })

  it('should throw if sharding key is defined but not present in where conditions when DELETE', async function() {
    await assert.rejects(async () => {
      await Like.remove({})
    }, /sharding key/i)
  })

  it('should throw if sharding key is defined but set to null when UPDATE', async function() {
    await assert.rejects(async () => {
      await Like.update({ userId: 1 }, { userId: null })
    }, /sharding key/i)
  })

  it('should not throw if sharding key is defined and not set when UPDATE', async function() {
    await assert.doesNotReject(async () => {
      await Like.update({ userId: 1 }, { deletedAt: new Date() })
    }, /sharding key/i)
  })

  it('should append sharding key to DELETE condition automatically', async function() {
    const like = await Like.create({ articleId: 1, userId: 1 })
    await assert.doesNotReject(async () => {
      await like.remove()
      await like.remove(true)
    }, /sharding key/i)
  })

  it('should append sharding key to UPDATE condition automatically', async function() {
    const like = await Like.create({ articleId: 1, userId: 1})
    like.articleId = 2
    await assert.doesNotReject(async () => {
      await like.update()
    }, /sharding key/i)
  })
})

// https://dev.mysql.com/doc/refman/5.7/en/date-and-time-functions.html
describe('=> Date Functions', function() {
  before(async function() {
    await Promise.all([
      Post.create({ title: 'New Post', createdAt: new Date(2012, 4, 15) }),
      Post.create({ title: 'Archbishop Lazarus', createdAt: new Date(2012, 4, 15) }),
      Post.create({ title: 'Leah', createdAt: new Date(2017, 10, 11) })
    ])
  })

  after(async function() {
    await Post.remove({}, true)
  })

  it('SELECT YEAR(date)', async function() {
    expect(await Post.select('YEAR(createdAt) as year').order('year')).to.eql([
      { year: 2012 }, { year: 2012 }, { year: 2017 }
    ])
  })

  it('WHERE YEAR(date)', async function() {
    const posts = await Post.select('title').where('YEAR(createdAt) = 2017')
    expect(posts.map(post => post.title)).to.eql(['Leah'])
  })

  it('GROUP BY MONTH(date) AS month', async function() {
    assert.deepEqual(
      await Post.select('MONTH(createdAt) as month').group('month').count().order('count DESC'),
      [ { count: 2, month: 5 },
        { count: 1, month: 11 } ])

    assert.deepEqual(
      await Post.group('MONTH(createdAt) as month').count().order('count DESC'),
      [ { count: 2, month: 5 },
        { count: 1, month: 11 } ])
  })

  it('ORDER BY DAY(date)', async function() {
    const posts = await Post.order('DAY(createdAt)').order('title')
    expect(posts.map(post => post.title)).to.eql([
      'Leah', 'Archbishop Lazarus', 'New Post'
    ])
  })
})

describe('=> Arithmetic Operators', function() {
  before(async function() {
    await Promise.all([
      Post.create({ title: 'New Post' }),
      Post.create({ title: 'Archbishop Lazarus' }),
      Post.create({ title: 'Leah' })
    ])
  })

  after(async function() {
    await Post.remove({}, true)
  })

  it('should support querying on calculated fields', async function() {
    const oddPosts = await Post.find('id % 2 = 1')
    const evenPosts = await Post.find('id % 2 - 1 = -1')
    oddPosts.forEach(post => assert.equal(post.id % 2, 1))
    evenPosts.forEach(post => assert.equal(post.id % 2, 0))
    assert.deepEqual(oddPosts.concat(evenPosts), await Post.all)
  })
})
