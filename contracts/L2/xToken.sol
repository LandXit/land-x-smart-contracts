// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "../interfaces/IxTokenRouter.sol";
import "../interfaces/IcToken.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

//xToken NFT in = shards. xToken in = NFT
//1 xToken = (tillableArea * cropShare) /  10000
contract XToken is Context, ERC20Permit, ERC20Burnable, Ownable, AccessControl {
     bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
     struct Stake {
        uint256 amount;
        uint256 startTime;
    }

    string public crop;

    IxTokenRouter public xTokenRouter; // address of xTokenRouter

    mapping(address => uint256) public Claimed;

    mapping(address => Stake) public Staked;
    mapping(address => uint256) public Yield;


    Stake public TotalStaked;
    uint256 public TotalYield;

    Stake public NonStakedTokens;
    uint256 public NonDistributedYield;

    event TokenStaked(address staker, uint256 amount);
    event Unstaked(address staker, uint256 amount);
    event YieldClaimed(address staker, uint256 amount);

    constructor(
        address _xTokenRouter,
        string memory _crop// "SOY, CORN etc",
    ) ERC20Permit(string(abi.encodePacked("x", _crop))) ERC20("LandX xToken", string(abi.encodePacked("x", _crop))) {
        require(_xTokenRouter != address(0), "zero address is not allowed");
          _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        crop = _crop;
        xTokenRouter = IxTokenRouter(_xTokenRouter);
    }

     // only minter can mint xTokens, for example L2 bridge
    function mint(address account, uint256 amount) public onlyRole(MINTER_ROLE){
        _mint(account, amount);
    }

    function stake(uint256 amount) public {
        _transfer(msg.sender, address(this), amount);
        uint256 yield = _calculateYield(Staked[msg.sender]);
        TotalYield += _calculateTotalYield();
        Yield[msg.sender] += yield;
        Staked[msg.sender].startTime = block.timestamp;
        TotalStaked.startTime = block.timestamp;
        TotalStaked.amount += amount;
        Staked[msg.sender].amount += amount;
        //_calculateNonDistributedYield();
        emit TokenStaked(msg.sender, amount);
    }

    function unstake(uint256 amount) public {
        require(Staked[msg.sender].amount >= amount);
        _transfer(address(this), msg.sender, amount);
        claim();
        Staked[msg.sender].amount -= amount;
        TotalStaked.amount -= amount;
       // _calculateNonDistributedYield();
        emit Unstaked(msg.sender, amount);
    }

    function claim() public {
        address cToken = xTokenRouter.getCToken(crop);
        uint256 yield = _calculateYield(Staked[msg.sender]);
        TotalYield =
            TotalYield +
            _calculateTotalYield() -
            (Yield[msg.sender] + yield);
        IcToken(cToken).mint(msg.sender, (Yield[msg.sender] + yield));
        Claimed[msg.sender] += (Yield[msg.sender] + yield);
        Staked[msg.sender].startTime = block.timestamp;
        TotalStaked.startTime = block.timestamp;
        Yield[msg.sender] = 0;
        emit YieldClaimed(msg.sender, yield);
    }

    function availableToClaim(address account) public view returns (uint256) {
        return Yield[account] + _calculateYield(Staked[account]);
    }

    function totalAvailableToClaim() public view returns (uint256) {
        return TotalYield + _calculateTotalYield();
    }

    // calculate cTokanes amount generated since amount was staked
    function _calculateYield(Stake storage s) internal view returns (uint256) {
        uint256 elapsedSeconds = block.timestamp - s.startTime;
        uint256 delimeter = 365 * 1 days;
        return (s.amount * elapsedSeconds) / delimeter;
    }

    function _calculateTotalYield() internal view returns (uint256) {
        uint256 elapsedSeconds = block.timestamp - TotalStaked.startTime;
        uint256 delimeter = 365 * 1 days;
        return (TotalStaked.amount * elapsedSeconds) / delimeter;
    }

    function setXTokenRouter(address _router) public onlyOwner {
        require(_router != address(0), "zero address is not allowed");
        xTokenRouter = IxTokenRouter(_router);
    }

    function renounceOwnership() public view override onlyOwner {
        revert ("can 't renounceOwnership here");
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
