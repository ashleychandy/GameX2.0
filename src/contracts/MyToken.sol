// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

interface IMyToken is IERC20 {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function revokeRole(bytes32 role, address account) external;
    function getMinterBurnerAddresses() external view returns (address[] memory minters, address[] memory burners);
}

contract MyToken is ERC20, AccessControl, IMyToken {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint256 private constant INITIAL_SUPPLY = 100000 * 10**18;

    // Efficient storage using mappings
    mapping(address => bool) private _isMinter;
    mapping(address => bool) private _isBurner;
    
    // Keep arrays only for enumeration
    address[] private _mintersList;
    address[] private _burnersList;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);

        // Add initial minter and burner
        _isMinter[msg.sender] = true;
        _isBurner[msg.sender] = true;
        _mintersList.push(msg.sender);
        _burnersList.push(msg.sender);

        _mint(msg.sender, INITIAL_SUPPLY);
    }

    function mint(address to, uint256 amount) public override onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public override onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }

    function revokeRole(bytes32 role, address account) public override(AccessControl, IMyToken) onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
        if (role == MINTER_ROLE && _isMinter[account]) {
            _isMinter[account] = false;
            _removeFromList(_mintersList, account);
        } else if (role == BURNER_ROLE && _isBurner[account]) {
            _isBurner[account] = false;
            _removeFromList(_burnersList, account);
        }
    }

    function grantRole(bytes32 role, address account) public override(AccessControl) onlyRole(getRoleAdmin(role)) {
        super.grantRole(role, account);
        if (role == MINTER_ROLE && !_isMinter[account]) {
            _isMinter[account] = true;
            _mintersList.push(account);
        } else if (role == BURNER_ROLE && !_isBurner[account]) {
            _isBurner[account] = true;
            _burnersList.push(account);
        }
    }

    function getMinterBurnerAddresses() external view returns (address[] memory minters, address[] memory burners) {
        return (_mintersList, _burnersList);
    }

    // Optimized removal function
    function _removeFromList(address[] storage list, address account) private {
        uint256 length = list.length;
        for (uint256 i = 0; i < length; i++) {
            if (list[i] == account) {
                list[i] = list[length - 1];
                list.pop();
                break;
            }
        }
    }

    // Required overrides
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControl)
        returns (bool)
    {
        return
            interfaceId == type(IMyToken).interfaceId ||
            interfaceId == type(IERC20).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
