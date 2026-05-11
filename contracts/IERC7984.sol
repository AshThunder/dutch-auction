// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";

interface IERC7984 {
    function confidentialTransfer(address to, euint64 amount) external;
    function confidentialTransferFrom(address from, address to, euint64 amount) external;
    function confidentialBalanceOf(address account) external view returns (euint64);
}
