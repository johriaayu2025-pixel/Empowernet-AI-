// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EvidenceRegistry {
    struct Evidence {
        string evidenceHash;
        uint256 timestamp;
        string category;
        bool exists;
    }

    mapping(string => Evidence) private registry;
    address public owner;

    event EvidenceAnchored(string evidenceHash, string category, uint256 timestamp);

    constructor() {
        owner = msg.sender;
    }

    function anchorEvidence(string memory _hash, string memory _category) public {
        require(!registry[_hash].exists, "Evidence already exists");
        
        registry[_hash] = Evidence({
            evidenceHash: _hash,
            timestamp: block.timestamp,
            category: _category,
            exists: true
        });

        emit EvidenceAnchored(_hash, _category, block.timestamp);
    }

    function verifyEvidence(string memory _hash) public view returns (bool, uint256, string memory) {
        Evidence memory e = registry[_hash];
        return (e.exists, e.timestamp, e.category);
    }
}
