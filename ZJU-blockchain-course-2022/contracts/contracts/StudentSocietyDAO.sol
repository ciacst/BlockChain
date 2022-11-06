// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment the line to use openzeppelin/ERC20
// You can use this dependency directly because it has been installed already
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract MyERC20 is ERC20 {

    mapping(address => bool) claimedAirdropPlayerList;

    address internal m_manager;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        m_manager = msg.sender;
    }

    function mint(address user, uint32 money) external{
        require(msg.sender == m_manager);
        _mint(user, money);
    }

    function burn(address user, uint32 money) external{
        require(msg.sender == m_manager);
        _burn(user, money);
    }

}

contract StudentSocietyDAO {

    uint32 constant public STATE_VOTING = 0;
    uint32 constant public STATE_ACCESS = 1;
    uint32 constant public STATE_UNACCESS = 2;  
    uint32 constant public VOTE_COST = 5;  
    uint32 constant public PROPOSAL_COST = 20;
    uint32 constant public ACCESS_GAIN = 50;
    uint32 constant public START_GAIN = 100;

    uint32 total_index = 0;  
    
    // use a event if you want
    event ProposalInitiated(uint32 proposalIndex);

    struct Proposal {
        uint32 index;      
        address proposer;  
        uint256 start_time; 
        uint256 duration;  
        string name;       
        string introductions;
        uint32 agree;       
        uint32 disagree;     
        uint32 state;      
        // ...
        // TODO add any member if you want
    }

    MyERC20 studentERC20;

    // 用户发起的活动通过的次数
    mapping(address => uint32) public access_proposals_number;
    // 用户是否领取初始浙大币
    mapping(address => bool) claimedAirdropPlayerList;
    // 通过 index 定位活动
    mapping(uint32 => Proposal) public proposals; 
    // 记录一个用户是否对该活动投过票
    mapping(uint32 => mapping(address => bool)) public voted_person;

    constructor() {
        // maybe you need a constructor
        studentERC20 = new MyERC20("name", "symbol");
    }

    function UseLess() payable public {
    }

    // 领取初始浙大币
    function airdrop() public {
        require(claimedAirdropPlayerList[msg.sender] == false, "You have got airdrop before");
        studentERC20.mint(msg.sender, START_GAIN);
        claimedAirdropPlayerList[msg.sender] = true;
    }

    // 用户发起活动
    function proposalInitiate(uint256 duration, string memory name, string memory introductions, uint256 start_time) public {
        // 判断活动投票时间是否正常
        require(duration > 0, "Duration can't be less than 0!");
        // 判断活动名字是否为空，介绍可以为空
        bytes memory tmp_name = bytes(name);
        require(tmp_name.length != 0, "Name can't be void!");
        // 判断用户账户余额是否支持发起活动
        require(studentERC20.balanceOf(msg.sender) >= PROPOSAL_COST, "You money in account is not enough!");
        duration = duration * 60000;
        studentERC20.burn(msg.sender, PROPOSAL_COST);
        Proposal memory p = Proposal(total_index, msg.sender, start_time, duration, name, introductions, 0, 0, 0);
        proposals[total_index] = p;
        total_index++;
    } 

    function vote(uint32 user_choice, uint32 index, uint256 now_time) public {
        // 判断投票是否截止
        dateOver(index, now_time);
        require(proposals[index].state == STATE_VOTING, "This proposal's voting is ended!"); 
        // 判断用户是否已经对该活动投过票
        require(voted_person[index][msg.sender] == false, "You have voted for this proposal before!");
        // 判断用户账户余额是否支持投票
        require(studentERC20.balanceOf(msg.sender) >= VOTE_COST, "You money in account is not enough!");
        if (user_choice == 1) {
            proposals[index].agree++;
        }
        else {
            proposals[index].disagree++;
        }
        studentERC20.burn(msg.sender, VOTE_COST);
        voted_person[index][msg.sender] = true;
    }

    function dateOver(uint32 index, uint256 now_time) public {
        if (proposals[index].start_time + proposals[index].duration <= now_time) {
            judgeAccess(index);
        }
    }

    function judgeAccess(uint32 index) public {
        if (proposals[index].agree > proposals[index].disagree && proposals[index].state == STATE_VOTING) {
            proposals[index].state = STATE_ACCESS;
            studentERC20.mint(proposals[index].proposer, ACCESS_GAIN);
            access_proposals_number[proposals[index].proposer]++;
        }
        else if (proposals[index].agree <= proposals[index].disagree && proposals[index].state == STATE_VOTING) {
            proposals[index].state = STATE_UNACCESS;
        }
    }

    function getTotal() public view returns(uint32) {
        return total_index;
    }

    function balanceOf(address account) public view returns(uint256) {
        return studentERC20.balanceOf(account);
    }

    function checkDate(uint256 now_time) public {
        for (uint32 i = 0; i < total_index; i++) {
            dateOver(i, now_time);
        }
    }

}
