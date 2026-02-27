#![no_std]
#![no_main]

extern crate alloc;

mod allocator;
pub mod messaging;
pub mod pods;
pub mod linked_wallets;

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}
