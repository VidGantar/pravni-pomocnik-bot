/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="sl" dir="ltr">
    <Head />
    <Preview>Ponastavitev gesla za ePTP</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://kssbxmudxbifxndnyhsq.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="ePTP" width="120" height="48" style={{ marginBottom: '24px' }} />
        <Heading style={h1}>Ponastavitev gesla</Heading>
        <Text style={text}>
          Prejeli smo zahtevo za ponastavitev gesla za vaš ePTP račun. Kliknite spodnji gumb za izbiro novega gesla.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Ponastavi geslo
        </Button>
        <Text style={footer}>
          Če niste zahtevali ponastavitve gesla, lahko to sporočilo prezrete. Vaše geslo ne bo spremenjeno.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#f8f9fb', fontFamily: "'Plus Jakarta Sans', 'Inter', Arial, sans-serif" }
const container = { backgroundColor: '#ffffff', padding: '40px 32px', borderRadius: '12px', margin: '40px auto', maxWidth: '480px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(215, 25%, 15%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(215, 15%, 50%)', lineHeight: '1.6', margin: '0 0 25px' }
const button = { backgroundColor: 'hsl(215, 85%, 45%)', color: '#ffffff', fontSize: '14px', fontWeight: '600' as const, borderRadius: '12px', padding: '12px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
