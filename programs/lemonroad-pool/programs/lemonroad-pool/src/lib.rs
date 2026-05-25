use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

declare_id!("8Uqs1mAVZY7CMwUshiiHg1oyh7jsFcdL8FTXX56qZkZf");

pub const ATTEMPT_AMOUNT: u64 = 1_000_000; // 1 USDT, 6 decimals
pub const USDT_DECIMALS: u8 = 6;

#[program]
pub mod lemonroad_pool {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, crank: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.global_config;
        config.admin = ctx.accounts.admin.key();
        config.crank = crank;
        config.usdt_mint = ctx.accounts.usdt_mint.key();
        config.vault = ctx.accounts.vault.key();
        config.rollover = 0;
        config.bump = ctx.bumps.global_config;
        config.vault_bump = ctx.bumps.vault_authority;
        Ok(())
    }

    pub fn deposit_attempt(ctx: Context<DepositAttempt>, hour_id: i64) -> Result<()> {
        let hour = &mut ctx.accounts.hour_ledger;
        if hour.hour_id == 0 {
            hour.hour_id = hour_id;
            hour.bump = ctx.bumps.hour_ledger;
        }

        let cpi = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.user_token.to_account_info(),
                mint: ctx.accounts.usdt_mint.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer_checked(cpi, ATTEMPT_AMOUNT, USDT_DECIMALS)?;

        hour.deposited = hour.deposited.saturating_add(ATTEMPT_AMOUNT);
        hour.participant_count = hour.participant_count.saturating_add(1);

        Ok(())
    }

    pub fn settle_hour(
        ctx: Context<SettleHour>,
        hour_id: i64,
        participant_count: u32,
        amounts: [u64; 3],
    ) -> Result<()> {
        require_keys_eq!(ctx.accounts.crank.key(), ctx.accounts.global_config.crank);
        let hour = &mut ctx.accounts.hour_ledger;
        require!(!hour.settled, PoolError::AlreadySettled);
        require_eq!(hour.hour_id, hour_id);

        let pool = ctx
            .accounts
            .global_config
            .rollover
            .saturating_add(hour.deposited);

        let expected = compute_splits(pool, participant_count);
        require!(amounts == expected, PoolError::InvalidSplit);

        let _vault_auth = ctx.accounts.vault_authority.key();
        let seeds = &[
            b"vault_authority".as_ref(),
            &[ctx.accounts.global_config.vault_bump],
        ];
        let signer = &[&seeds[..]];

        let winner_accounts = [
            &ctx.accounts.winner1_token,
            &ctx.accounts.winner2_token,
            &ctx.accounts.winner3_token,
        ];

        for i in 0..3 {
            if amounts[i] == 0 {
                continue;
            }
            let cpi = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.vault.to_account_info(),
                    mint: ctx.accounts.usdt_mint.to_account_info(),
                    to: winner_accounts[i].to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                signer,
            );
            token::transfer_checked(cpi, amounts[i], USDT_DECIMALS)?;
        }

        let paid: u64 = amounts.iter().sum();
        let rollover = pool.saturating_sub(paid);

        let config = &mut ctx.accounts.global_config;
        config.rollover = rollover;
        hour.settled = true;

        Ok(())
    }
}

fn compute_splits(pool: u64, participants: u32) -> [u64; 3] {
    let mut out = [0u64; 3];
    if pool == 0 || participants == 0 {
        return out;
    }
    if participants >= 1 {
        out[0] = pool * 60 / 100;
    }
    if participants >= 5 {
        out[1] = pool * 30 / 100;
    }
    if participants >= 15 {
        out[2] = pool * 10 / 100;
    }
    out
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + GlobalConfig::INIT_SPACE,
        seeds = [b"global_config"],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    pub usdt_mint: Account<'info, Mint>,

    /// CHECK: PDA token authority
    #[account(seeds = [b"vault_authority"], bump)]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = admin,
        token::mint = usdt_mint,
        token::authority = vault_authority,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(hour_id: i64)]
pub struct DepositAttempt<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(seeds = [b"global_config"], bump = global_config.bump)]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + HourLedger::INIT_SPACE,
        seeds = [b"hour".as_ref(), hour_id.to_le_bytes().as_ref()],
        bump
    )]
    pub hour_ledger: Account<'info, HourLedger>,

    #[account(mut)]
    pub user_token: Account<'info, TokenAccount>,

    #[account(mut, address = global_config.vault)]
    pub vault: Account<'info, TokenAccount>,

    /// CHECK: vault authority PDA
    #[account(seeds = [b"vault_authority"], bump = global_config.vault_bump)]
    pub vault_authority: UncheckedAccount<'info>,

    pub usdt_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(hour_id: i64)]
pub struct SettleHour<'info> {
    pub crank: Signer<'info>,

    #[account(mut, seeds = [b"global_config"], bump = global_config.bump)]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        seeds = [b"hour".as_ref(), hour_id.to_le_bytes().as_ref()],
        bump = hour_ledger.bump
    )]
    pub hour_ledger: Account<'info, HourLedger>,

    #[account(mut, address = global_config.vault)]
    pub vault: Account<'info, TokenAccount>,

    /// CHECK: vault authority PDA
    #[account(seeds = [b"vault_authority"], bump = global_config.vault_bump)]
    pub vault_authority: UncheckedAccount<'info>,

    pub usdt_mint: Account<'info, Mint>,

    #[account(mut)]
    pub winner1_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub winner2_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub winner3_token: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct GlobalConfig {
    pub admin: Pubkey,
    pub crank: Pubkey,
    pub usdt_mint: Pubkey,
    pub vault: Pubkey,
    pub rollover: u64,
    pub bump: u8,
    pub vault_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct HourLedger {
    pub hour_id: i64,
    pub deposited: u64,
    pub participant_count: u32,
    pub settled: bool,
    pub bump: u8,
}

#[error_code]
pub enum PoolError {
    #[msg("Hour already settled")]
    AlreadySettled,
    #[msg("Payout amounts do not match pool rules")]
    InvalidSplit,
}
