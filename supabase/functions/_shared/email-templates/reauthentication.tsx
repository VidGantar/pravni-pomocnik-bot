/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="sl" dir="ltr">
    <Head />
    <Preview>Vaša potrditvena koda za ePTP</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://kssbxmudxbifxndnyhsq.supabase.co/storage/v1/object/public/email-assets/logo.png" alt="ePTP" width="120" height="48" style={{ marginBottom: '24px' }} />
        <Heading style={h1}>Potrditev identitete</Heading>
        <Text style={text}>Uporabite spodnjo kodo za potrditev vaše identitete:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Koda bo kmalu potekla. Če niste zahtevali te kode, lahko to sporočilo prezrete.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#f8f9fb', fontFamily: "'Plus Jakarta Sans', 'Inter', Arial, sans-serif" }
const container = { backgroundColor: '#ffffff', padding: '40px 32px', borderRadius: '12px', margin: '40px auto', maxWidth: '480px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(215, 25%, 15%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(215, 15%, 50%)', lineHeight: '1.6', margin: '0 0 25px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(215, 85%, 45%)', margin: '0 0 30px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
