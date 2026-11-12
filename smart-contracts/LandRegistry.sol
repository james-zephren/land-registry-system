// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title LandRegistry
 * @dev A secure land registry system that stores land ownership and transfer records on blockchain
 */
contract LandRegistry {
    // Custom types
    enum LandStatus {
        PENDING,
        APPROVED,
        VERIFIED,
        REJECTED,
        TRANSFERRED
    }

    enum TransferStatus {
        PENDING,
        APPROVED,
        REJECTED,
        COMPLETED
    }

    // Structs
    struct Land {
        string parcelId;
        address owner;
        string location;
        uint256 area;
        string documentHash;
        string dataHash;
        LandStatus status;
        uint256 registeredAt;
        uint256 lastUpdatedAt;
    }

    struct Transfer {
        uint256 transferId;
        string parcelId;
        address fromOwner;
        address toOwner;
        TransferStatus status;
        uint256 approvals;
        uint256 requiredApprovals;
        uint256 initiatedAt;
        uint256 completedAt;
    }

    // State variables
    mapping(string => Land) public lands;
    mapping(string => Transfer[]) public landTransfers;
    mapping(string => mapping(address => bool)) public transferApprovals;
    mapping(string => address[]) public landOfficers;
    
    address[] public registeredOfficers;
    address public admin;
    
    string[] public allParcelIds;
    
    uint256 public transferCounter = 0;
    uint256 public requiredOfficerApprovals = 2;

    // Events
    event LandRegistered(
        string indexed parcelId,
        address indexed owner,
        string dataHash,
        uint256 timestamp
    );

    event LandApproved(
        string indexed parcelId,
        address indexed approver,
        uint256 timestamp
    );

    event TransferInitiated(
        uint256 indexed transferId,
        string indexed parcelId,
        address indexed fromOwner,
        address toOwner,
        uint256 timestamp
    );

    event TransferApproved(
        uint256 indexed transferId,
        string indexed parcelId,
        address indexed approver,
        uint256 timestamp
    );

    event TransferCompleted(
        uint256 indexed transferId,
        string indexed parcelId,
        address indexed newOwner,
        string dataHash,
        uint256 timestamp
    );

    event OfficerRegistered(
        address indexed officer,
        uint256 timestamp
    );

    event OfficerRevoked(
        address indexed officer,
        uint256 timestamp
    );

    event DataHashUpdated(
        string indexed parcelId,
        string newDataHash,
        uint256 timestamp
    );

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    modifier onlyOfficer() {
        bool isOfficer = false;
        for (uint256 i = 0; i < registeredOfficers.length; i++) {
            if (registeredOfficers[i] == msg.sender) {
                isOfficer = true;
                break;
            }
        }
        require(isOfficer, "Only registered officers can call this function");
        _;
    }

    modifier landExists(string memory parcelId) {
        require(bytes(lands[parcelId].parcelId).length > 0, "Land does not exist");
        _;
    }

    // Constructor
    constructor() {
        admin = msg.sender;
    }

    // Admin functions
    function registerOfficer(address officer) external onlyAdmin {
        require(officer != address(0), "Invalid officer address");
        
        for (uint256 i = 0; i < registeredOfficers.length; i++) {
            require(registeredOfficers[i] != officer, "Officer already registered");
        }
        
        registeredOfficers.push(officer);
        emit OfficerRegistered(officer, block.timestamp);
    }

    function revokeOfficer(address officer) external onlyAdmin {
        require(officer != address(0), "Invalid officer address");
        
        for (uint256 i = 0; i < registeredOfficers.length; i++) {
            if (registeredOfficers[i] == officer) {
                registeredOfficers[i] = registeredOfficers[registeredOfficers.length - 1];
                registeredOfficers.pop();
                emit OfficerRevoked(officer, block.timestamp);
                return;
            }
        }
        revert("Officer not found");
    }

    function setRequiredApprovals(uint256 required) external onlyAdmin {
        require(required > 0, "Required approvals must be greater than 0");
        require(required <= registeredOfficers.length, "Cannot require more approvals than officers");
        requiredOfficerApprovals = required;
    }

    // Land registration functions
    function registerLand(
        string memory parcelId,
        address owner,
        string memory location,
        uint256 area,
        string memory documentHash,
        string memory dataHash
    ) external onlyOfficer {
        require(bytes(parcelId).length > 0, "Parcel ID cannot be empty");
        require(owner != address(0), "Invalid owner address");
        require(area > 0, "Area must be greater than 0");
        require(bytes(dataHash).length > 0, "Data hash cannot be empty");
        require(bytes(lands[parcelId].parcelId).length == 0, "Land already registered");

        lands[parcelId] = Land({
            parcelId: parcelId,
            owner: owner,
            location: location,
            area: area,
            documentHash: documentHash,
            dataHash: dataHash,
            status: LandStatus.PENDING,
            registeredAt: block.timestamp,
            lastUpdatedAt: block.timestamp
        });

        allParcelIds.push(parcelId);
        emit LandRegistered(parcelId, owner, dataHash, block.timestamp);
    }

    function approveLand(string memory parcelId) external onlyOfficer landExists(parcelId) {
        require(lands[parcelId].status == LandStatus.PENDING, "Land is not pending approval");
        require(!isOfficerApprovedLand(parcelId, msg.sender), "Officer already approved this land");

        landOfficers[parcelId].push(msg.sender);

        if (landOfficers[parcelId].length >= requiredOfficerApprovals) {
            lands[parcelId].status = LandStatus.APPROVED;
        }

        lands[parcelId].lastUpdatedAt = block.timestamp;
        emit LandApproved(parcelId, msg.sender, block.timestamp);
    }

    function verifyLand(string memory parcelId, string memory currentDataHash) 
        external 
        onlyOfficer 
        landExists(parcelId) 
        returns (bool) 
    {
        require(lands[parcelId].status == LandStatus.APPROVED, "Land must be approved first");
        
        bool isValid = keccak256(abi.encodePacked(lands[parcelId].dataHash)) == 
                       keccak256(abi.encodePacked(currentDataHash));
        
        if (isValid) {
            lands[parcelId].status = LandStatus.VERIFIED;
            lands[parcelId].lastUpdatedAt = block.timestamp;
        }
        
        return isValid;
    }

    // Transfer functions
    function initiateTransfer(
        string memory parcelId,
        address oldOwner,
        address newOwner
    ) external onlyOfficer landExists(parcelId) returns (uint256) {
        require(newOwner != address(0), "Invalid new owner address");
        require(lands[parcelId].owner == oldOwner, "Old owner does not match record");
        require(lands[parcelId].status == LandStatus.VERIFIED, "Land must be verified");
        require(oldOwner != newOwner, "Cannot transfer to same owner");

        uint256 transferId = transferCounter;
        transferCounter++;

        Transfer memory newTransfer = Transfer({
            transferId: transferId,
            parcelId: parcelId,
            fromOwner: oldOwner,
            toOwner: newOwner,
            status: TransferStatus.PENDING,
            approvals: 0,
            requiredApprovals: requiredOfficerApprovals,
            initiatedAt: block.timestamp,
            completedAt: 0
        });

        landTransfers[parcelId].push(newTransfer);
        
        emit TransferInitiated(
            transferId,
            parcelId,
            oldOwner,
            newOwner,
            block.timestamp
        );

        return transferId;
    }

    function approveTransfer(string memory parcelId, uint256 transferId) 
        external 
        onlyOfficer 
        landExists(parcelId) 
    {
        require(transferId < landTransfers[parcelId].length, "Invalid transfer ID");
        Transfer storage transfer = landTransfers[parcelId][transferId];
        
        require(transfer.status == TransferStatus.PENDING, "Transfer is not pending");
        require(!transferApprovals[parcelId][msg.sender], "Officer already approved this transfer");

        transferApprovals[parcelId][msg.sender] = true;
        transfer.approvals++;

        emit TransferApproved(transferId, parcelId, msg.sender, block.timestamp);

        if (transfer.approvals >= transfer.requiredApprovals) {
            completeTransfer(parcelId, transferId);
        }
    }

    function completeTransfer(string memory parcelId, uint256 transferId) 
        internal 
        landExists(parcelId)
    {
        require(transferId < landTransfers[parcelId].length, "Invalid transfer ID");
        Transfer storage transfer = landTransfers[parcelId][transferId];
        
        require(transfer.status == TransferStatus.PENDING, "Transfer already processed");
        require(transfer.approvals >= transfer.requiredApprovals, "Not enough approvals");

        transfer.status = TransferStatus.COMPLETED;
        transfer.completedAt = block.timestamp;
        
        Land storage land = lands[parcelId];
        land.owner = transfer.toOwner;
        land.status = LandStatus.TRANSFERRED;
        land.lastUpdatedAt = block.timestamp;

        emit TransferCompleted(
            transferId,
            parcelId,
            transfer.toOwner,
            land.dataHash,
            block.timestamp
        );
    }

    // Query functions
    function getLand(string memory parcelId) 
        external 
        view 
        landExists(parcelId) 
        returns (Land memory) 
    {
        return lands[parcelId];
    }

    function getLandByOwner(address owner) 
        external 
        view 
        returns (Land[] memory) 
    {
        uint256 count = 0;
        for (uint256 i = 0; i < allParcelIds.length; i++) {
            if (lands[allParcelIds[i]].owner == owner) {
                count++;
            }
        }

        Land[] memory userLands = new Land[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allParcelIds.length; i++) {
            if (lands[allParcelIds[i]].owner == owner) {
                userLands[index] = lands[allParcelIds[i]];
                index++;
            }
        }

        return userLands;
    }

    function getAllLands() external view returns (Land[] memory) {
        Land[] memory allLands = new Land[](allParcelIds.length);
        for (uint256 i = 0; i < allParcelIds.length; i++) {
            allLands[i] = lands[allParcelIds[i]];
        }
        return allLands;
    }

    function getTransfers(string memory parcelId) 
        external 
        view 
        landExists(parcelId) 
        returns (Transfer[] memory) 
    {
        return landTransfers[parcelId];
    }

    function getOfficers() external view returns (address[] memory) {
        return registeredOfficers;
    }

    function isOfficer(address account) external view returns (bool) {
        for (uint256 i = 0; i < registeredOfficers.length; i++) {
            if (registeredOfficers[i] == account) {
                return true;
            }
        }
        return false;
    }

    function isOfficerApprovedLand(string memory parcelId, address officer) 
        internal 
        view 
        returns (bool) 
    {
        for (uint256 i = 0; i < landOfficers[parcelId].length; i++) {
            if (landOfficers[parcelId][i] == officer) {
                return true;
            }
        }
        return false;
    }

    function verifyDataIntegrity(string memory parcelId, string memory currentDataHash) 
        external 
        view 
        landExists(parcelId) 
        returns (bool) 
    {
        return keccak256(abi.encodePacked(lands[parcelId].dataHash)) == 
               keccak256(abi.encodePacked(currentDataHash));
    }

    function updateLandDataHash(string memory parcelId, string memory newDataHash)
        external
        onlyOfficer
        landExists(parcelId)
    {
        require(bytes(newDataHash).length > 0, "Data hash cannot be empty");
        lands[parcelId].dataHash = newDataHash;
        lands[parcelId].lastUpdatedAt = block.timestamp;
        emit DataHashUpdated(parcelId, newDataHash, block.timestamp);
    }

    function getAllParcelIds() external view returns (string[] memory) {
        return allParcelIds;
    }

    function getParcelCount() external view returns (uint256) {
        return allParcelIds.length;
    }
}

