const batchGhostDiscover = require('./batch-ghost-discover');

module.exports = {
    getAPIAuthorsObj: async () => {
        const url = process.env.GC_TOOLS_apiURL;
        const key = process.env.GC_TOOLS_adminAPIKey;

        let apiUsers = await batchGhostDiscover({
            type: 'users',
            url: url,
            key: key
        });

        let users = [];

        apiUsers.forEach(function (author){
            users.push({
                name: `${author.name} - ${author.slug} - ${author.count.posts} posts`,
                value: author
            });
        });

        return users;
    },
    getAPITagsObj: async (additionalOpts) => {
        const url = process.env.GC_TOOLS_apiURL;
        const key = process.env.GC_TOOLS_adminAPIKey;

        let apiTags = await batchGhostDiscover({
            type: 'tags',
            url: url,
            key: key
        });

        let tags = [];

        apiTags.forEach(function (tag){
            tags.push({
                name: `${tag.name} - ${tag.slug} - ${tag.count.posts} posts`,
                value: tag
            });
        });

        if (additionalOpts) {
            tags.push(additionalOpts);
        }

        return tags;
    }
};
