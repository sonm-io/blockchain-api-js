module.exports = {
    livenet: {
        url: 'https://mainnet.infura.io',
        contractAddress: {},
    },
    livenet_private: {
        url: 'https://sidechain.livenet.sonm.com',
        contractAddress: {
            addressRegistry: '0xd1a6f3d1ae33b4b19565a6b283d7a05c5a0decb0',
        },
    },
    rinkeby: {
        url: 'https://rinkeby.infura.io',
        contractAddress: {},
    },
    rinkeby_private: {
        url: 'https://sidechain-dev.sonm.com',
        contractAddress: {
            addressRegistry: '0x79b084653ca2588ed3915159e368db58aef165ee',
        },
    },
    testrpc: {
        url: 'http://localhost:8545',
        contractAddress: {
            token: '0xb29d1e8259571de17429b771ca455210f25b9fce',
            gate: '0x81a46d5ea60ceb1b1cae6fe536e801e9eceb13db',
        },
    },
};